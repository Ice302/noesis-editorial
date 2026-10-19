# NOĒSIS — Archival Essay & Manuscript Studio

An Aeon-style longform essay site with an archival, analog look: a broadsheet
reading spread with marginalia, a live manuscript editor, argument-tree
cartography and an editorial bullet journal.

Built with **SvelteKit 3**, **Svelte 5 (runes)**, **Tailwind CSS 4** and
**TypeScript 6**. The page is prerendered to static HTML.

## Quick start

```sh
npm install
npm run dev          # http://localhost:5173
```

Requires Node **22.17+** (SvelteKit 3's minimum; enforced by `engines` + `.npmrc`).

## Scripts

| Command            | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                              |
| `npm run build`    | Production build + prerender to `.svelte-kit/output`    |
| `npm run preview`  | Serve the production build locally                      |
| `npm run check`    | Type-check Svelte + TS (`svelte-check`)                 |
| `npm run lint`     | Prettier check + ESLint                                 |
| `npm run format`   | Format everything with Prettier                         |
| `npm test`         | Unit tests (Vitest)                                     |
| `npm run validate` | check → lint → test → build — run this before deploying |

## Using the studio

| Panel                     | What you can do                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **01. Aeon Spread**       | Read the essay. Click a `§` in a margin note to jump to its paragraph.                                                                |
| **02. Manuscript Studio** | Click any paragraph to edit. Select text → **✦ Highlight**. **↺ Revert** restores the archival text. Edits are saved in this browser. |
| **03. Argument Tree**     | Click or Tab to a node to inspect it; **Read § in spread** jumps to the source paragraph. Drag to pan, −/+ to zoom.                   |
| **04. Analog Log**        | Filter by day/week, collapse days, tick tasks (□ → ■), and rapid-log new entries.                                                     |

The HUD on the left adjusts typography (or tree geometry in the tree view).
**.MD** / **.TREE** in the spine copy the essay as Markdown or the tree as JSON.

**Keyboard:** `1`–`4` switch panels · `[` / `]` previous / next essay ·
`←`/`→`/`Home`/`End` move between tabs · `Enter` in a paragraph finishes editing
(`Shift+Enter` for a line break).

**Links:** the address bar tracks the open essay and panel
(`/?essay=ms-03&view=tree`), so any spread can be shared.

## Project layout

```text
src/
  app.html, app.css          document shell, fonts, Tailwind theme + global styles
  routes/+page.svelte         app shell, persistence, URL sync, shortcuts
  routes/+layout.(svelte|ts)  global CSS, favicon, prerender = true
  lib/
    types.ts                  domain types (Essay, TreeNode, LogGroup, HudParams…)
    views.ts                  the four panels: labels, shortcuts, ARIA ids
    data/                     essays and journal seed data (+ integrity tests)
    state/studio.svelte.ts    StudioState class + typed context
    utils/                    text/telemetry/export, sanitizer, tree layout, browser helpers
    components/               one component per region of the page
docs/
  ARCHITECTURE.md             how the pieces fit together, and why
  CONTENT.md                  how to add or edit an essay
  IMPROVEMENTS.md             the 100-point improvement log, with sources
  legacy/                     the earlier single-file prototype, kept for reference
```

## Deploying

`@sveltejs/adapter-auto` is configured in `vite.config.ts` and detects Vercel,
Netlify, Cloudflare Pages and similar hosts automatically. Because the page is
prerendered, any static host works too: swap in `@sveltejs/adapter-static` if you
want a plain folder of files.

## Editor setup

Install the recommended VS Code extensions (Svelte, Tailwind CSS, Prettier,
ESLint). If VS Code shows errors like _"`onclick` does not exist in type
HTMLProps"_ while `npm run check` passes, update the **Svelte for VS Code**
extension — older versions don't understand Svelte 5 syntax.

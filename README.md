# NOĒSIS — Archival Essay & Manuscript Studio

An Aeon-style longform essay site with an archival, analog look: a broadsheet
reading spread with marginalia, a manuscript editor with revision history and
redlines, argument-tree cartography, an editorial bullet journal, a searchable
archive and an RSS feed.

Built with **SvelteKit 3**, **Svelte 5 (runes)**, **Tailwind CSS 4** and
**TypeScript 6**. Every page is prerendered to static HTML. A small optional
API (Node's built-in SQLite) lets signed-in editors share revisions.

## Quick start

```sh
npm install
npm run dev          # http://localhost:5173
```

Requires Node **22.18+** (SvelteKit 3's minimum is 22.17; 22.18 adds the
built-in TypeScript support the editor CLI uses). Enforced by `engines` + `.npmrc`.

## Scripts

| Command                                 | What it does                                              |
| --------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                           | Dev server with hot reload                                |
| `npm run build`                         | Production build + prerender to `.svelte-kit/output`      |
| `npm run preview`                       | Serve the production build locally (pages + API)          |
| `npm run check`                         | Type-check Svelte + TS (`svelte-check`)                   |
| `npm run lint` / `format`               | Prettier check + ESLint / format everything               |
| `npm test`                              | Unit tests (Vitest: server + client projects)             |
| `npm run test:e2e`                      | Browser tests (Playwright, uses your installed Chrome)    |
| `npm run editor:add -- <user> "<Name>"` | Create an editor account (`--reset` to change a password) |
| `npm run validate`                      | check → lint → unit → build → e2e — run before deploying  |

## Pages

| URL            | What it is                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `/`            | The studio, opened on the issue's first essay                                  |
| `/essays/<id>` | One essay (e.g. `/essays/ms-03`), with its own title, preview card and JSON-LD |
| `?view=…`      | Panel on any essay URL: `editor`, `tree`, `analog` (reader is the default)     |
| `/archive`     | Archive index with full-text search (`?q=` is shareable) and category filters  |
| `/rss.xml`     | RSS 2.0 feed with full text                                                    |

Old links like `/?essay=ms-03&view=tree` redirect to the new URLs.

## Using the studio

| Panel                     | What you can do                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **01. Aeon Spread**       | Read. A bar at the top shows reading progress. Click a `§` in a margin note to jump to its paragraph.                   |
| **02. Manuscript Studio** | Click a paragraph to edit; **✦ Highlight** marks a selection. Changes form a _working draft_ — see below.               |
| **03. Argument Tree**     | Click or Tab to a node. **↑** sub-argument · **↓** parent · **←/→** siblings · **Home** root. Drag to pan, −/+ to zoom. |
| **04. Analog Log**        | Filter by day/week, collapse days, tick tasks (□ → ■), rapid-log entries.                                               |

**Revisions.** The studio keeps a history per essay: archival text → R1, R2, …
→ your working draft. **Commit** saves the draft as the next revision with a
note; **Redline** shows word-level insertions and deletions (between any
revision and its predecessor, or everything since the archive via the toolbar);
**Restore** copies an older text back into the draft; **Discard Draft** throws
away uncommitted changes.

- **Signed out**, revisions are saved in your browser only (**LOCAL**).
- **Signed in** (spine → _Editorial Access_), revisions are stored on the server
  and shared with every editor (**SHARED**). If a colleague commits while you
  are drafting, your commit is refused, your draft is kept, and the history
  refreshes so you can review the redline and commit again.

Readers always see the published text from `src/lib/data/essayContent.js`;
revisions are an editorial workspace.

**Keyboard:** `1`–`4` switch panels · `[` / `]` previous / next essay ·
`←`/`→`/`Home`/`End` in the tab strip · `Enter` finishes editing a paragraph
(`Shift+Enter` for a line break).

The HUD adjusts typography (or tree geometry in the tree view); on phones it
starts collapsed — tap its header. **.MD** / **.TREE** copy the essay as
Markdown or the tree as JSON.

## Configuration

Copy `.env.example` to `.env`:

| Variable         | Used for                                                                               | Default                 |
| ---------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `SITE_URL`       | Canonical URLs, Open Graph tags, absolute links in `/rss.xml` (baked in at build time) | `http://localhost:4173` |
| `NOESIS_DB_PATH` | SQLite file for editor accounts, sessions and shared revisions                         | `data/noesis.db`        |

**Set `SITE_URL` before building for production**, or previews and the feed
will point at localhost.

## Shared editing: accounts and hosting

There is no public sign-up. Whoever runs the server creates accounts:

```sh
npm run editor:add -- elena "Elena Rostova-Vane"     # prompts for a password (min 10 chars)
npm run editor:add -- elena --reset                   # change it later
```

How this behaves depends on where you deploy (your call — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deployment-options)):

- **A Node host with a persistent disk** (a VPS, Fly.io/Railway volumes, …):
  everything works — prerendered pages plus the `/api` endpoints and the SQLite file.
- **A purely static host:** the site works fully for readers and in local mode;
  the _Editorial Access_ section simply doesn't appear because there's no API.
- **Serverless without a disk:** pages work, but SQLite writes won't persist —
  the store in `src/lib/server/store.ts` would need swapping for a hosted database.

`@sveltejs/adapter-auto` is still configured; choosing a specific adapter is
left to you.

## Project layout

```text
src/
  app.html, app.css             document shell, font loading, Tailwind theme + global styles
  env.ts                        environment variables (SvelteKit 3 defineEnvVars)
  hooks.server.ts               resolves the signed-in editor for /api requests
  routes/
    +layout.(svelte|ts)         global CSS, favicon, RSS link, prerender = true
    (studio)/+layout.svelte     the studio shell + browser-side effects
    (studio)/+page.*            /            (first essay)
    (studio)/essays/[id]/+page.* /essays/<id> (one prerendered page per essay)
    archive/                    archive index + search
    rss.xml/                    feed
    api/                        session, login/logout, revisions
    +error.svelte               404 / error page
  lib/
    types.ts, views.ts, fonts.ts
    data/                       essays, journal seed (+ integrity tests)
    state/studio.svelte.ts      StudioState: navigation, drafts, revisions, redlines, session
    api/client.ts               browser client for the API (swappable for tests)
    server/                     SQLite store, auth (scrypt, sessions, rate limit), request validation
    utils/                      text/export, sanitizer, diff, search, feed, tree layout, browser helpers
    components/                 one component per region of the page
scripts/add-editor.ts           editor account CLI
e2e/                            Playwright tests
docs/                           architecture, content guide, performance, improvement log
```

## Testing

- `npm test` — 112 unit tests. Rune modules (`*.svelte.test.ts`) run in a
  custom Vitest environment that compiles them for the browser, so `$state`
  proxies and `$effect` behave as in the app (see `src/test/client-environment.ts`).
- `npm run test:e2e` — 24 browser tests on desktop and a Pixel 7 profile,
  against the production build with a throwaway database. Uses the installed
  Chrome; on CI run `npx playwright install chromium` and set `PW_CHANNEL=chromium`.

## Editor setup

Install the recommended VS Code extensions (Svelte, Tailwind CSS, Prettier,
ESLint). If VS Code shows errors like _"`onclick` does not exist in type
HTMLProps"_ while `npm run check` passes, update **Svelte for VS Code** — older
versions don't understand Svelte 5 syntax.

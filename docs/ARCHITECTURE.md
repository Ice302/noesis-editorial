# Architecture

## Overview

```text
routes/+layout.svelte            global CSS, favicon, RSS <link>
└─ (studio)/+layout.svelte ── setStudio(new StudioState({ api, routeEssayId, onSelectEssay }))
   │   ├─ LeftSpineNav       essay links, slash nav, export, editorial sign-in
   │   ├─ WoodcutHeader      masthead + ARIA tab strip
   │   ├─ ParameterHUD ─── HudSlider ×n   (collapsible below xl)
   │   ├─ panel
   │   │    ├─ BroadsheetEssay ── StudioToolbar, RevisionPanel, ReadingProgress
   │   │    ├─ ArgumentTree     (keyed per essay)
   │   │    └─ AnalogLog
   │   ├─ LoginDialog, Toast
   │   └─ {@render children()}  ← pages: only <svelte:head> metadata (EssayHead)
   ├─ (studio)/+page            /               first essay
   └─ (studio)/essays/[id]      /essays/<id>    one prerendered page per essay
archive/+page.svelte             /archive        search (standalone page)
rss.xml/+server.ts               /rss.xml        prerendered feed
api/**/+server.ts                /api/*          shared editing (not prerendered)
```

### Why the studio lives in a layout

The `(studio)` route group holds the shell and the `StudioState`. Navigating
between `/essays/ms-01` and `/essays/ms-02` changes only the page, so the HUD,
drafts, open panel and sign-in survive. The state reads the essay from the
route (`routeEssayId: () => page.params.id ?? first`), and choosing an essay
calls `onSelectEssay`, which navigates with `goto`. The URL is the source of
truth for which essay is open, and the back button works.

Each page renders only `<EssayHead>` (title, description, canonical, Open
Graph, Twitter card, schema.org `Article` JSON-LD). Because pages are
prerendered, link previews and search engines see the right essay without
running JavaScript.

## State: `StudioState` (`src/lib/state/studio.svelte.ts`)

One class with `$state` fields and `$derived` views. It is provided through
`createContext`, so it is never shared between server requests.

### Text model per essay

```text
archival text (essayContent.js)  →  R1 → R2 → … → Rn  →  working draft (edits[id])
                                    └── history ──┘      └── uncommitted ──┘
```

| Field                      | Meaning                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `history`                  | `sharedRevisions[id]` when signed in, else `localRevisions[id]`                                  |
| `baseParagraphs`           | latest revision's text, or the archive                                                           |
| `paragraphs`               | the draft if there is one, else `baseParagraphs` — what the spread shows                         |
| `hasEdits`                 | the draft differs from `baseParagraphs`                                                          |
| `redline` / `redlineParts` | two text references (`'archive'`, `'draft'`, or a revision id) and their per-paragraph word diff |

The first keystroke copies `baseParagraphs` into `edits[id]`. Raw
`contenteditable` HTML is kept while typing, so the caret never jumps, and
sanitized on blur and again on commit.

### Side effects are injected

`StudioOptions` supplies the route reader, the navigation callback and a
`StudioApi`. Tests pass fakes, and the app passes `httpApi`. Inside the class
there is no `fetch`, `goto` or `$app/*` import.

### Effects (all in the studio layout, all syncing _outward_)

1. Persist `{ hud, edits, localRevisions, log }` to localStorage (debounced 250 ms, flushed on `pagehide`).
2. Mirror the open panel into `?view=` with a shallow, replacing `goto`. It waits while a real navigation is in flight, so it can't cancel it.
3. Load shared revisions for the open essay when an editor is signed in.
4. Reset scroll when the essay changes.

On mount, legacy `/?essay=` links are redirected first (awaited), then state is
hydrated, then the session is checked.

## Shared editing

### Request flow

```text
browser ──fetch──▶ /api/* ──▶ hooks.server.ts ──cookie──▶ store.getSession(sha256(token))
                                 │ locals.editor
                                 ▼
                          +server.ts handler ──▶ EditorialStore (node:sqlite)
```

| Endpoint                     | Method | Notes                                                          |
| ---------------------------- | ------ | -------------------------------------------------------------- |
| `/api/session`               | GET    | `{ editor }`. A 200 tells the client shared editing exists.    |
| `/api/auth/login`            | POST   | `{ username, password }` → httpOnly session cookie             |
| `/api/auth/logout`           | POST   | deletes the session                                            |
| `/api/essays/[id]/revisions` | GET    | history (signed-in only)                                       |
| `/api/essays/[id]/revisions` | POST   | `{ paragraphs, note, baseRevisionId }` → 201, or 409 + history |

### Security decisions

- **Passwords:** scrypt (N=16384, r=8, p=1) with a per-user salt. Parameters
  are stored in the hash, so they can be raised later. Unknown usernames still
  run scrypt against a dummy hash, so response timing doesn't reveal which
  accounts exist. The error message is generic.
- **Sessions:** a 32-byte random token, kept only in an `httpOnly`,
  `SameSite=Lax` cookie (`Secure` outside localhost). The database stores its
  SHA-256. Sessions last 30 days and slide forward when used past the halfway
  point.
- **Brute force:** 5 login attempts per address + username per 15 minutes
  (in-memory, per process).
- **Input:** JSON bodies are size- and shape-checked. Paragraph count must
  match the essay. Every paragraph is re-sanitized on the server, whatever the
  client sent.
- **Concurrency:** commits name the revision they were based on. The insert
  runs in a `BEGIN IMMEDIATE` transaction and is refused with 409 if a newer
  revision exists.
- **CSRF:** cookies are `SameSite=Lax` and mutations require
  `Content-Type: application/json`, which cross-site forms can't send.
  SvelteKit 3 also rejects cross-origin mutative requests without a content type.
- **Caching:** API responses carry `Cache-Control: no-store`.

### Deployment options

The database code needs Node and a persistent file. Which host to use is a
deployment decision. What each choice means:

| Host type                      | Reading & local mode | Shared editing                                 |
| ------------------------------ | -------------------- | ---------------------------------------------- |
| Node server with a disk        | ✓                    | ✓ (as built)                                   |
| Static hosting                 | ✓                    | hidden (no `/api`, sign-in doesn't show)       |
| Serverless, no persistent disk | ✓                    | needs `EditorialStore` swapped for a hosted DB |

`EditorialStore` is the only code that touches SQLite, so swapping it is a
contained change.

## Rendering details

- **Argument tree:** `layoutTree()` is a pure function (BFS layout, label
  collision avoidance, bounds). The component renders it declaratively, centres
  the viewBox on the tree, and is keyed per essay so pan and zoom start fresh.
  Arrow keys follow the tree's shape (it grows upward).
- **Redlines:** `diffWords()` is an LCS over word tokens, with the common
  prefix and suffix trimmed first. It runs on visible text (markup stripped),
  is rendered with `<ins>` / `<del>`, and needs no `{@html}`.
- **Search:** in-memory and diacritic-insensitive. Every term must match.
  Matches are weighted title 10, category/author 6, subtitle 4, deck 2, body 1.
  Body matches get a snippet.
- **HTML safety:** everything shown with `{@html}` goes through
  `sanitizeEssayHtml()` (allow-list rebuild). JSON-LD escapes `<`.

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for the Lighthouse audit. Key choices:

- prerendered HTML for every page, with the app CSS inlined (`inlineStyleThreshold`)
- Google Fonts loaded without blocking, with Shippori Mincho subset to the
  glyphs used (`text=`). `src/lib/fonts.ts` and its test keep `app.html` in sync.
- the reading-progress bar reads layout once per animation frame

## Testing

| Layer      | Tool                           | Where                                                                                        |
| ---------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| Pure logic | Vitest `server` project        | `src/lib/**/*.test.ts` (utils, data, server store/auth)                                      |
| Rune state | Vitest `client` project        | `src/lib/**/*.svelte.test.ts`, compiled for the browser via `src/test/client-environment.ts` |
| End to end | Playwright (desktop + Pixel 7) | `e2e/*.spec.ts`, against `vite build` + `vite preview` with a seeded SQLite file             |

Why the client project exists: under the default Node environment,
`.svelte.ts` files compile for the server, where `$state` isn't proxied and
`$effect` never runs. A real reactivity bug (pushing into the raw array
returned by `??=`) passed the server-compiled tests and was caught by
Playwright. `studio.svelte.test.ts` now has a regression test for it.

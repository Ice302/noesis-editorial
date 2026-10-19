# Architecture

## Overview

```text
+page.svelte ── setStudio(new StudioState()) ──┐   (typed context)
  │                                            │
  ├─ LeftSpineNav     essay index, slash nav, export
  ├─ WoodcutHeader    masthead + ARIA tab strip
  ├─ ParameterHUD ─── HudSlider ×n             │  every component calls
  └─ panel                                     │  getStudio() and reads
       ├─ BroadsheetEssay ── StudioToolbar     │  fields directly; writes
       ├─ ArgumentTree   (keyed per essay)     │  go through methods
       └─ AnalogLog                            │
  Toast ───────────────────────────────────────┘
```

## State: `StudioState` (`src/lib/state/studio.svelte.ts`)

One class holds all UI state as `$state` fields, with everything computed from
it as `$derived` fields:

| Field                                                      | Kind       | Notes                                                    |
| ---------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `activeEssayId`, `activeView`                              | `$state`   | Mirrored to `?essay=&view=`                              |
| `hud`                                                      | `$state`   | Bound directly by the HUD sliders; persisted             |
| `edits`                                                    | `$state`   | `{ [essayId]: string[] }` — absent key = archival text   |
| `log`                                                      | `$state`   | Deep clone of `ANALOG_LOG_DB`; persisted                 |
| `activeEssay`, `paragraphs`                                | `$derived` | `paragraphs` prefers edits over the archive              |
| `renderedParagraphs`                                       | `$derived` | Sanitized HTML, the only thing passed to `{@html}`       |
| `telemetry`                                                | `$derived` | Words, reading time, lexical diversity of _current_ text |
| `selectedNode`, `visibleLog`, `isLiveEditMode`, `hasEdits` | `$derived` |                                                          |

**Why a class in context, not a module singleton?** Module state is shared by
every request during server rendering. Context scopes it to one component tree,
and `createContext` gives typed `getStudio` / `setStudio` without string keys
(Svelte best-practices guide).

**Why `$derived` instead of `$effect`?** Effects that write state run after
render and can loop. Derivations are lazy, glitch-free and cached. The page uses
exactly three effects, all syncing _out_ to systems Svelte doesn't own:
localStorage (debounced), the URL, and panel scroll position.

## Rendering the argument tree

`layoutTree()` (`utils/tree.ts`) is a pure function: nodes + HUD geometry →
positioned nodes with SVG paths and label boxes. The maths is the original
breadth-first walk (two-segment branches bending at 52% of their length;
length × 0.84 and stroke × 0.68 per level), now with:

- an O(n) children index instead of filtering all nodes for every node,
- a cycle guard so malformed data can't hang the page,
- **label collision avoidance**: labels are placed in BFS order and lifted in
  18-unit steps until clear; a dashed leader line connects a lifted label to its node,
- `treeBounds()` + `fitZoom()` so the viewBox centres on the tree and each essay
  opens at a zoom that fills the canvas.

`ArgumentTree.svelte` renders this declaratively. The original version rebuilt
`innerHTML` and re-attached click listeners on every slider tick; now Svelte
only updates the attributes that changed. The component is wrapped in
`{#key activeEssayId}` so pan and zoom reset for each essay.

## Manuscript editing and HTML safety

Paragraphs are stored as small inline-HTML strings. In the studio each one is a
`contenteditable` `<p>` with a function binding:

```svelte
bind:innerHTML={(() => studio.paragraphs[idx], (html) => studio.setParagraph(idx, html))}
```

The first edit copies the essay's paragraphs into `edits[essayId]`. Raw input is
kept while typing, so the caret never jumps, and normalised on blur.

Everything shown with `{@html}` first goes through `sanitizeEssayHtml()`. It
rebuilds the markup from scratch with an allow-list (`em`, `strong`, `br`,
`mark.editorial-highlight`). Every attribute is dropped, `script`, `style` and
similar elements are removed with their content, and stray `<` is escaped. It is
string-based, so it behaves the same during prerendering, in tests and in the
browser.

## Styling

- Tailwind v4 with an `@theme` block defining the palette (`ink`, `ink-mid`,
  `ink-soft`, `pastel`, `pastel-deep`, `vellum`, `paper`, `desk`) and the three
  font families (`serif` Newsreader, `mono` JetBrains Mono, `display` Shippori Mincho).
- Rules that must reach `{@html}` output or `<body>` live in `app.css`. Svelte's
  scoped `<style>` can't see markup it didn't compile.
- HUD values reach CSS through custom properties set with `style:` on the root
  element (`--essay-font-scale`, `--essay-col-width`, …).
- Print, reduced-motion and focus-visible styles are global.

## Persistence

`localStorage["noesis:studio:v1"]` holds `{ hud, edits, log }`. Writes are
debounced by 250 ms and flushed on `pagehide`. Every storage access is wrapped
in `try/catch`, because private windows and blocked site data must not break the
page. Bump the `v1` suffix if the stored shape changes incompatibly.

## Testing

`npm test` runs Vitest over:

- `utils/*.test.ts` — telemetry, Markdown export, sanitizer (XSS cases), tree layout, labels, bounds
- `state/studio.svelte.test.ts` — navigation, editing, revert, journal, URL hydration
- `data/essayContent.test.ts` — content integrity (single tree root, valid
  `parentId`/`paraIndex`, allowed markup, unique ids)

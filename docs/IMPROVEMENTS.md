# Improvement log — 100 changes

Every item below is implemented in this codebase. Items 1–30 restore pieces the
attached design declared but never finished, or fix bugs in it. The rest improve
structure, code quality, features, security, accessibility, performance and
tooling. The visual design of the attached file (palette, typography, layout,
spacing) is kept. New controls reuse its existing styles.

## A. Finishing the attached design (1–30)

1. **Two missing essays added.** The data header promised "4 full essays" but only two existed. Added _ms-03 "The Commonplace Book"_ and _ms-04 "The Essay as Form"_, each with a deck, paragraphs, marginalia and an argument tree.
2. **Manuscript Studio actually edits.** `isLiveEditMode` and `setEditorSubMode` were declared but unused, and the studio tab showed the same read-only spread. Paragraphs are now `contenteditable` in the studio.
3. **Analog filter filters.** The Today / This Week buttons set `analogFilter`, but nothing read it. The list now filters by `timeframe`.
4. **Active filter highlight follows the selection.** "All Time" was always styled as active.
5. **Collapsible journal days.** The unused `collapsed` field now drives expand/collapse.
6. **Journal times shown.** The `time` field on each entry was never rendered.
7. **Typography sliders completed.** `lineHeight`, `marginaliaOpacity` and `highlightIntensity` existed in `hudParams` with no controls.
8. **Tree geometry sliders added.** `treeSpread`, `treeScale`, `treeLength` and `treeRootWidth` had no controls. The HUD now shows them while the tree is open.
9. **`--marginalia-opacity` is used.** The variable was set on `:root` but no CSS read it.
10. **Full node inspector.** The excerpt panel showed only the excerpt, ignoring `label`, `type`, `weight`, `citations` and `scholia`.
11. **Tree → text navigation.** Each node's `paraIndex` was unused. **Read § in spread** now jumps to and flashes that paragraph.
12. **Byline rendered.** `author`, `authorBio`, `code` and `date` were in the data but never displayed.
13. **`filepath` shown** in the studio toolbar, as the archive metaphor intends.
14. **Exports copy something.** `.MD` and `.TREE` only showed a "Copied…" toast. They now write Markdown (with marginalia as footnotes) or tree JSON to the clipboard.
15. **Lexical density bug fixed.** It counted _unique letters_ divided by words. It is now the type–token ratio: distinct word forms ÷ words.
16. **Dead `qrSvgEl` reference removed.** No QR feature existed.
17. **Imperative tree renderer replaced.** `innerHTML` string-building plus manual `addEventListener` became a declarative Svelte SVG.
18. **Spine nav reflects the active view.** "Essays/" was always underlined.
19. **Essay numbering fixed.** The `0{idx + 1}` prefix would print "010" for a tenth essay. It now uses `padStart`.
20. **Toast timer fixed.** Timers were never cleared, so a second toast could vanish after a fraction of a second.
21. **Scoped styles that never applied are now global.** Svelte drops `body {…}` from a component, and its scoping can't reach `<mark class="editorial-highlight">` inside `{@html}`, so highlights only worked by accident.
22. **Fonts wired up.** `font-display` wasn't defined, so Shippori Mincho never rendered, and `font-mono` fell back to the system monospace. Both are now defined in Tailwind's `@theme`.
23. **Tailwind Play CDN removed.** It's a development-only runtime compiler that duplicated the project's real Tailwind v4 install.
24. **Unused Phosphor Icons script removed** (no icon was used).
25. **Duplicate font loading removed.** Fonts were requested by `<svelte:head>` and again by a CSS `@import`.
26. **Tree labels no longer overlap.** Colliding labels are lifted clear, with a dashed leader line to their node.
27. **Tree no longer hides under the excerpt panel.** Space is reserved for the panel, and the view centres on the tree's bounds.
28. **Drag-to-pan implemented.** The canvas had `cursor-grab` but no dragging. Pointer capture converts screen pixels to viewBox units.
29. **Zoom controls and per-essay fit.** −/+/%, **Reset view**, and each essay opens at a zoom that fills the canvas.
30. **Zero-degree branches respected.** `child.angle || fallback` treated `0` as missing. It now uses `??`.

## B. Structure (31–45)

31. **Monolith split into components.** Used the empty files already in the repo: `LeftSpineNav`, `WoodcutHeader`, `ParameterHUD`, `BroadsheetEssay`, `ArgumentTree`, `AnalogLog`.
32. **Small reusable pieces:** `HudSlider`, `StudioToolbar`, `Toast`.
33. **Content separated from code:** `#lib/data/essayContent.js` and `analogLog.js`.
34. **Domain types** in `#lib/types.ts`. The JS data files are type-checked through JSDoc.
35. **`StudioState` class** with `$state` and `$derived` fields replaces loose top-level variables.
36. **Typed context** (`createContext`) instead of module globals, so state can't leak between server requests.
37. **Pure utility modules:** `text`, `sanitize`, `tree`, `browser`.
38. **`VIEW_META`** is the single source of panel labels, spine labels and shortcuts.
39. **`#lib` barrel added** and the broken `imports` path fixed. It pointed at a non-existent `index.js`.
40. **Seed data never mutated.** The journal is deep-cloned into state.
41. **Design tokens.** About 100 hard-coded hex values became named Tailwind colours (`ink`, `pastel`, `paper`, `vellum`, `desk`…).
42. **Old prototype archived** to `docs/legacy/` instead of being lost.
43. **Brand favicon** (N monogram) added and linked. The template favicon was never linked.
44. **`prerender = true`** in `+layout.ts`.
45. **HUD values set with `style:` on the root element** instead of mutating `document.documentElement`.

## C. Svelte 5 / SvelteKit 3 code quality (46–60)

46. **`$derived` for every computed value:** active essay, selected node, telemetry, visible log, edit mode.
47. **No double input handling.** The `bind:value` + `oninput` pairs could read stale values. Binding alone now drives updates.
48. **Keyed `{#each}` blocks everywhere.**
49. **clsx-style class arrays** instead of string interpolation.
50. **`$props.id()`** links each HUD label to its slider.
51. **`$bindable`** two-way prop in `HudSlider`.
52. **Function bindings** (`bind:innerHTML={get, set}`) for editable paragraphs.
53. **Effects only sync outward** (storage, URL, scroll), each with cleanup.
54. **`<svelte:window>`** handles shortcuts and `pagehide`, with no manual listeners.
55. **`runes: true`** compiler option rejects legacy syntax.
56. **Adapter configured in `vite.config.ts`,** as SvelteKit 3 requires. This fixes the `adapter_missing` build warning.
57. **`goto(resolve(…), { shallow: true, replace: true })`** for URL updates. Kit 3 deprecates `replaceState`.
58. **Strict TypeScript everywhere.** 14 type errors became 0.
59. **`$state.snapshot`** produces plain objects for persistence.
60. **Listener leak removed.** The old renderer attached new click listeners on every slider tick.

## D. Features (61–79)

61. **Persistence** of HUD settings, edits and the journal (versioned key, debounced, fails soft).
62. **Deep links:** `?essay=ms-03&view=tree`.
63. **Keyboard shortcuts:** `1`–`4` for panels, `[` `]` for essays.
64. **✦ Highlight** wraps the selected text in an editorial highlight.
65. **↺ Revert** with confirmation.
66. **Paste as plain text,** so no foreign styles enter the manuscript.
67. **Enter finishes a paragraph;** Shift+Enter inserts a line break.
68. **Live telemetry while editing** (word count, reading time, density).
69. **Tickable tasks** □ ⇄ ■.
70. **Rapid-log form** for new journal entries.
71. **Symbol key legend** for the bullet journal.
72. **`§` links in margin notes** scroll to and flash their paragraph.
73. **HUD reset** button.
74. **More telemetry:** reading time, and scholia or node counts.
75. **Markdown export uses the edited text** and includes the deck and footnotes.
76. **Clipboard fallback** for non-secure contexts.
77. **Print stylesheet** hides the chrome and removes the overflow clipping that cut pages off.
78. **Essay switch scrolls** back to the top of the panel.
79. **Small screens:** the node inspector stacks below the tree instead of covering it.

## E. Security (80–83)

80. **Allow-list sanitizer** runs before every `{@html}`.
81. **Attributes stripped, dangerous elements dropped with their content, unterminated tags escaped.** Covered by tests.
82. **Length limit** on journal input.
83. **URL parameters validated.** Unknown essays and views are ignored.

## F. Accessibility (84–94)

84. **WAI-ARIA tabs pattern:** `tablist`/`tab`, roving `tabindex`, ←/→/Home/End.
85. **Panel is a labelled `tabpanel`.**
86. **Skip link** to the content.
87. **Toast live region** stays mounted so announcements aren't missed.
88. **Tree nodes are focusable buttons** with labels, `aria-pressed`, and Enter/Space.
89. **State exposed to assistive tech:** `aria-current`, `aria-pressed`, `aria-expanded`, and `role="checkbox"` on tasks.
90. **Visible focus rings,** in pastel on the dark spine.
91. **`prefers-reduced-motion` respected,** including smooth scrolling.
92. **`lang="ja"`** on Japanese text, and decorative numerals hidden from screen readers.
93. **One `<h1>` per page,** plus `<dl>` for metrics and landmark labels.
94. **Form controls labelled,** and Tailwind v4's `cursor: default` on buttons restored to `pointer`.

## G. Performance (95–97)

95. **Font loading tuned:** preconnect to both Google origins, `display=swap`, `<link>` instead of CSS `@import`, and only the weights the design uses (variable ranges).
96. **Prerendered HTML.** The essay is readable before JavaScript loads and is served from a CDN.
97. **Cheaper tree updates.** An O(n) child index replaces an O(n²) filter, and Svelte updates changed attributes instead of rebuilding the whole SVG.

## H. Tooling and documentation (98–100)

98. **Lint fixed and modernised.** `@eslint/js` was imported but not installed. Added `globals`, a TypeScript parser for `.svelte` files, and ESLint's `defineConfig`.
99. **Vitest plus 58 tests** cover telemetry, export, sanitizer, tree layout and labels, state, and content integrity. Added `test` and `validate` scripts, `engines`, Prettier ignores, and VS Code settings.
100.  **Documentation:** README, `ARCHITECTURE.md`, `CONTENT.md`, this log, JSDoc on every module and `@component` docs on every component.

## Sources

- SvelteKit 3 migration guide — config in `vite.config`, `#lib`, `$app/tsconfig`, `$app/state`, deprecated `replaceState`: <https://svelte.dev/docs/kit/migrating-to-sveltekit-3>
- SvelteKit 3 release candidate announcement: <https://svelte.dev/blog/sveltekit-3-release-candidate>
- Svelte best practices — `$derived` over `$effect`, `$state.raw`, keyed each, `createContext`, class arrays, `<svelte:window>`: <https://svelte.dev/docs/svelte/best-practices>
- Tailwind CSS font families, `@theme`, and `@import` order: <https://tailwindcss.com/docs/font-family>
- web.dev font best practices — preconnect, `font-display: swap`: <https://web.dev/articles/font-best-practices>
- Harry Roberts, "The Fastest Google Fonts": <https://csswizardry.com/2020/05/the-fastest-google-fonts/>
- W3C WAI-ARIA Authoring Practices, Tabs pattern: <https://www.w3.org/WAI/ARIA/apg/patterns/tabs/>
- MDN, ARIA `tablist` role: <https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/tablist_role>

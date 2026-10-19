# Adding or editing an essay

All essays live in [`src/lib/data/essayContent.js`](../src/lib/data/essayContent.js).
The file is plain JavaScript checked against the `Essay` type in
[`src/lib/types.ts`](../src/lib/types.ts), so your editor will flag missing or
misspelled fields.

## 1. Copy the template

Add an object to `ESSAYS_DB`:

```js
{
  id: 'ms-05',                       // unique; appears in URLs (?essay=ms-05)
  code: 'MS. NO-2026-05',
  category: 'PHILOSOPHY OF SCIENCE', // shown in caps in the spine and header
  date: 'WINTER 2026 · ISSUE V',
  title: 'Main title: optional subtitle',
  subtitle: 'One- or two-sentence standfirst, shown in italics.',
  author: 'Author Name',
  authorBio: 'Role, City',
  filepath: '\\ARCHIVE\\MS_2026_05_SLUG.DOC', // shown in the studio toolbar
  deckColumns: [ 'I. …', 'II. …', 'III. …', 'IV. …', 'V. …' ], // exactly five
  paragraphs: [ `…`, `…` ],
  marginalia: [ … ],
  treeNodes: [ … ]
}
```

## 2. Paragraph markup

Paragraphs are template strings that may contain only:

| Markup                                       | Renders as                      |
| -------------------------------------------- | ------------------------------- |
| `<em>…</em>`                                 | italics (titles, foreign words) |
| `<strong>…</strong>`                         | bold (use sparingly)            |
| `<mark class="editorial-highlight">…</mark>` | the yellow editorial highlight  |
| `<br>`                                       | line break                      |

Anything else is stripped by the sanitizer, and the content test fails, so you
find out before publishing. The first paragraph gets the drop cap automatically.

## 3. Marginalia

```js
{ id: 'm501', paraIndex: 0, type: 'SCHOLIUM', author: 'A.N.', date: 'Nov 02', text: '…' }
```

- `paraIndex` is **zero-based**: `0` is the first paragraph (shown as `§01`).
- `type` is one of `SCHOLIUM`, `CITATION`, `COUNTER-THESIS`, `REDLINE`.
- `id` must be unique within the essay.

## 4. Argument tree

```js
{ id: 'x0', parentId: null, label: 'ROOT THESIS: …', type: 'ROOT THESIS',
  paraIndex: 0, angle: 0, weight: 0.95, citations: 20, scholia: 8, excerpt: '…' }
```

- Exactly **one** node has `parentId: null` (the root).
- Every other `parentId` must be the `id` of a node in the same essay.
- `angle` is the branch direction relative to the parent, in degrees. Negative
  values lean left and positive values lean right. Roughly −50…50 works well.
  Siblings should differ by about 20° or more.
- Keep `label` under ~35 characters, uppercase. Label boxes are sized to the text.
- `weight` is between 0 and 1. It drives the bar in the excerpt panel.
- `paraIndex` controls where **Read § in spread** jumps.

## 5. Check it

```sh
npm test        # content integrity + everything else
npm run dev     # look at all four panels for the new essay
```

The spine lists essays in array order, and the index numbers (`01`, `02`, …) are
generated.

## Editing the journal seed

[`src/lib/data/analogLog.js`](../src/lib/data/analogLog.js) holds the starting
entries. `timeframe` (`today` / `week` / `older`) controls the filter buttons.
Symbols follow the key in `LOG_SYMBOL_KEY`. Browsers that already have saved
journal data keep their own copy, so clear site data to see seed changes.

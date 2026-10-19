# Performance audit (Lighthouse 12)

Run locally against the production build (`vite build` + `vite preview`) with
Chrome headless, on 19 Oct 2026. Lighthouse's mobile preset simulates a
mid-range phone on slow 4G. These are lab numbers on localhost: re-run them on
the deployed site, where CDN caching and real network latency apply.

## Before → after

| Page            | Form factor | Performance  | Accessibility | Best practices | SEO | FCP         | LCP         |
| --------------- | ----------- | ------------ | ------------- | -------------- | --- | ----------- | ----------- |
| `/essays/ms-01` | mobile      | 60 → **97**  | 100 → 100     | 100            | 100 | 6.7 → 1.9 s | 6.9 → 2.2 s |
| `/essays/ms-01` | desktop     | 95 → **100** | 97 → **100**  | 100            | 100 | 1.1 → 0.5 s | 1.1 → 0.7 s |
| `/archive`      | mobile      | 69 → **99**  | 100           | 100            | 100 | 5.0 → 1.5 s | 5.0 → 1.5 s |
| `/archive`      | desktop     | 99 → **100** | 100           | 100            | 100 | 0.7 → 0.4 s | 0.7 → 0.4 s |

CLS stayed under 0.06 and total blocking time under 30 ms throughout.

## What the first audit found, and the fixes

1. **Render-blocking font CSS (≈85 KB, ~3–5 s on mobile).** The Google Fonts
   stylesheet for Shippori Mincho, a Japanese font, declares well over a hundred
   unicode-range blocks, and almost all of them went unused.
   - Shippori is now requested with `text=`, so only the glyphs used download
     (printable ASCII, typographic punctuation, and the Japanese UI words).
     `src/lib/fonts.ts` builds the URL, and `fonts.test.ts` fails if a new
     heading uses a glyph outside the subset.
   - Both font stylesheets load with `media="print" onload="this.media='all'"`
     plus a `<noscript>` fallback, so they no longer block first paint. Text
     shows in Georgia/system fonts and swaps (`display=swap`).
   - The fonts are still served by Google: self-hosting is a separate decision.
2. **Render-blocking app CSS.** The ~8 KB (gzipped) stylesheet is now inlined
   into each prerendered page (`inlineStyleThreshold` in `vite.config.ts`),
   removing one round trip.
3. **Accessible name mismatch (WCAG 2.5.3).** `.MD`, `.TREE`, `PRINT` and `RSS`
   had `aria-label`s that didn't contain their visible text. They now keep the
   visible text and add a visually hidden description.
4. **Touch targets (WCAG 2.5.8).** The spine's slash navigation and export
   links were under 24 px tall. They now have a 24 px minimum hit area.

## Remaining notes

- **Cache lifetimes.** `vite preview` doesn't send long-lived cache headers.
  Real hosts serve SvelteKit's hashed `/_app/immutable/*` files with immutable
  caching. Check the headers once deployed.
- **Content-Security-Policy.** The non-blocking font pattern uses an inline
  `onload` attribute. A strict CSP would need a hash for it, or a small
  script-based loader instead.

## Re-running

```sh
npm run build && npx vite preview --port 4190
npx lighthouse http://localhost:4190/essays/ms-01 --view                 # mobile
npx lighthouse http://localhost:4190/essays/ms-01 --preset=desktop --view
```

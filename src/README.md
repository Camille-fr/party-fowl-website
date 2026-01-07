# Legacy static source

The files under `src/` capture the original Party Fowl static site that now feeds the Next.js parity build located in `partyfowl-next/`. Keep every asset, partial, and legacy script here synchronized with the copies exposed via `partyfowl-next/public/`.

## Editing workflow
1. Edit the HTML in `src/partials/home/` or `src/partials/layout/` for copy, imagery, or layout updates. These files are the canonical source; `lib/partialLoader.ts` sanitizes them at startup and mirrors them into `partyfowl-next/public/partials/`.
2. Restart the Next dev server after editing any partial because `lib/partialLoader.ts` caches the sanitized markup in memory. The sanitized copies refresh only when the server boots up again.
3. Keep the legacy scripts under `src/scripts/` (`layout.js`, `slides.js`, `debug-scroll.js`) aligned with `partyfowl-next/public/scripts/`. Any behavior change—timeline tweens, resize hooks, form wiring—needs to land in both copies.
4. When in doubt, consult `partyfowl-next/docs/dev-checklist.md`, `partyfowl-next/docs/payload-field-map.md`, and `partyfowl-next/docs/handoff-homepage.md` for guidance before shipping Content or structural changes.

## Diagnostic helper
- `debug-scroll.js` logs scroll lifecycle events when `window.__DEBUG_SCROLL__` is truthy. It is referenced in the social reels and menu carousel partials; remove the `<script>` tags from those partials if you retire the helper.

## Structure overview
```
src/
  assets/               # static fonts, images, and SVGs shared with the public build
  pages/                # legacy page templates (home, about, menu, etc.)
  partials/
    home/               # editable hero + slide fragments mirrored into public/partials/home
    layout/             # header/footer partials mirrored into public/partials/layout
  scripts/              # legacy layout + slides managers (keep these in sync with partyfowl-next/public/scripts)
```

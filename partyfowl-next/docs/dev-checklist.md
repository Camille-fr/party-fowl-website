# Dev checklist

## Run
1. Start the development server: `pnpm dev:3001`.
2. Walk through the QA steps below while that server is running to validate the parity shell.

## Setup commands
- `pnpm install` (only run after `pnpm-lock.yaml` changes or when dependencies are missing).
- `pnpm dev:3001` (loads Next.js on port 3001). Use `pnpm dev -- -p 3001` when you need to pass raw Node/Next flags.

## Browser QA steps
1. **Console** – no runtime errors from React, `slides.js`, or `layout.js`. Pay attention to cross-origin warnings from the iframe partials.
2. **Network** – every request to `/assets/*`, `/scripts/slides.js`, `/scripts/layout.js`, and `/partials/*` succeeds (no 404s or blocked fetches).
3. **Slide root** – `#slidesRoot` stays empty until `slides.js` hydrates the iframe sections, keeping the loader skeleton visible first.
4. **Desktop/mobile swap** – matchMedia fires cleanly; desktop/mobile iframe variants swap without duplicate slides or layout shifts.
5. **Loader & dock** – loader skeleton keeps space until the first iframe is sized, and the mobile dock always reserves its breakpoint-specific height.
6. **Header/footer locks** – the mounts rendered by React stay in the DOM with `data-layout-managed="next"` so `layout.js` never re-fetches them on the first load.
7. **Slides render** – each iframe (hero, reels, carousel, catering, the latest, CTA, contact) sizes itself to its content and hides overflow pins.
8. **Media hydration** – hero videos, poster images, and CTA icons load and play once they enter the viewport; autoplay is deferred when the user prefers reduced motion.
9. **Payload alignment** – confirm `docs/payload-field-map.md` still matches the partials you edited before the legacy scripts swap in the iframe DOM.
10. **Mobile dock CTAs** – buttons respond, `aria-label`s align with `siteSettings.mobileDock`, and desktop pills (Order Now/Locations) remain unique.

## Editing workflow reminders
- **Partials sync** – edit HTML under `src/partials/home` or `src/partials/layout`, then restart the dev server so `lib/partialLoader.ts` refreshes the sanitized copies in `public/partials/*`.
- **Legacy scripts** – if you change behavior in `public/scripts/slides.js` or `layout.js`, mirror those edits under `src/scripts/` (and vice versa) to keep both parity surfaces aligned.
- **Payload modeling** – update the block handles, field names, and assets in `docs/payload-field-map.md` whenever you alter copy or imagery so the Payload schema tracks the iframe DOM.
- **Contact form** – `home-08-contact` hosts the form; keep its subjects, preferred location options, and recaptcha/legal text identical in both desktop/mobile partials.

## Tailwind guardrails
- If you add Tailwind classes, introduce them through the React wrapper components first rather than touching the legacy partial HTML.
- Avoid editing any partial HTML until the Payload wiring is ready to consume Tailwind-driven sections.

## Troubleshooting pointers
- **Partial loader cache** – `lib/partialLoader.ts` caches sanitized HTML. Always restart the dev server after editing source partials.
- **Slides.js entry order** – the `SLIDES` array in `public/scripts/slides.js` defines the exact sequence of slide IDs. If you add/remove sections, update that array and the Payload blocks accordingly.
- **Header height signals** – `layout.js` dispatches `pfHeaderHeightChange` events so the iframe documents can set `--pf-header-height`. If layout jumps, confirm both scripts emit/listen to the event.
- **Footprints progress** – the social reels slide (`home-02-social-media-reels`) exposes a `__updateFootprintsProgress` hook. Keep the desktop/mobile variant in sync to prevent progress-tracking regressions.
- **Reduced motion** – `slides.js` respects `prefers-reduced-motion`; avoid forcing autoplaying videos if that media should stay still for accessibility.

## Docs cross-check
- Read `docs/handoff-homepage.md` for a structural walkthrough of how the React shell, partial loader, and legacy scripts interop.
- Keep `docs/payload-field-map.md` up to date with every content change so editors see matching block names/fields for each slide.
- Use this checklist before shipping any change that touches the loader, partials, or layout wiring and pair it with the QA guidance in `partyfowl-next/README.md`.

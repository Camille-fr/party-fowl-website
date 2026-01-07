# Homepage Handoff

## How parity works today (important)
- React renders the loader shell plus the header/footer mounts so the page loads with the Next-driven chrome before any legacy slides hydrate.
- `#slidesRoot` stays empty until the iframe loader kicks in, keeping the skeleton visible for as long as needed.
- `public/scripts/slides.js` injects the legacy slide DOM to match the visual experience the old site shipped with.
- `public/scripts/layout.js` respects the `data-layout-managed="next"` attributes so React-owned mounts are never clobbered on first load.
- This deliberate split keeps the app fast while we gradually replace each legacy slide with its native React counterpart.

> **Source of truth:**
> - `src/partials` is the canonical source for every layout and slideshow fragment.
> - `public/partials` mirrors those files so the Next runtime and legacy loader see the same DOM.
> - Restart the dev server after editing partials so `lib/partialLoader.ts` rebuilds its cache and the mirrored files stay fresh.

## Runtime shape
- `app/page.tsx` renders `components/home/HomePage`, which outputs the loader skeleton, the mobile dock markup, and `<main id="slidesRoot">` for the iframe slides to hydrate.
- `components/layout/SiteHeader` + `SiteFooter` import `lib/partialLoader.ts`. They sanitize `src/partials/layout/*.html`, render both desktop/mobile variants via `components/shared/VariantSwitch`, and keep `data-layout-managed="next"` on the mounts so `public/scripts/layout.js` never replaces them on the first load.
- `public/scripts/layout.js` still owns header/footer variant swaps, the contact form wiring, and fallback behavior when the Next-managed mounts disappear (e.g., in legacy preview builds).
- `public/scripts/slides.js` remains the single source of truth for the slideshow: it resolves `public/partials/home/`, creates desktop/mobile iframe pairs for each `SLIDES` entry, sizes them to their actual content, observes reveals/load/media, and syncs the mobile dock/footprint helpers with the visible section.

## Slide loader specifics
- The `SLIDES` array in `public/scripts/slides.js` defines the exact sequence of slide IDs and the partials each variant loads. Any change to the order, handle, or filename must be mirrored in `docs/payload-field-map.md`, `src/partials/home/`, and the iframe loader itself.
- Currently rendered slides: hero (`home-01-above-fold`), social reels (`home-02-social-media-reels`), menu carousel (`home-03-menu-carousel`), catering (`home-04-catering`), latest news (`home-05-the-latest`), CTA (`home-06-cta-section`), and the contact form (`home-08-contact`).
- Reward partials (`home-07-rewards-*`) exist but are not instantiated by `slides.js` yet; keep them synchronized between `src/partials` and `public/partials` and update the loader if you reinstate that section.
- `slides.js` seeds heights for the first slide to avoid jumps, switches variants via `matchMedia('(min-width: 1024px)')`, and keeps `pfHeaderHeightChange` listeners in sync so iframes know the header height.
- `state.fpIndex` points to the social reels slide so footstep progress updates target the correct iframe (the script looks for `__updateFootprintsProgress` inside that variant).

## Partial sanitization & caching
- `lib/partialLoader.ts` caches the sanitized HTML for `components/layout/*` at server start. After editing any `src/partials/*` file, restart the dev server to refresh the sanitized copies stored in memory and mirrored into `public/partials/*`.
- Both the React shell and the legacy scripts pull from the mirrored files (`public/partials/home/` and `public/partials/layout/`), so keep those directories in sync with your source edits.

## Payload alignment
- Payload block handles match the slide IDs above (e.g., `Home01AboveFold` for the hero, `Home05TheLatest` for the news slide). The fields for each block are documented in `docs/payload-field-map.md`.
- Editors should match their Payload entries with the partial filenames before `slides.js` swaps the iframe markup. That doc also highlights which copy/images are client-editable vs. dev-only.

## Contact form (Home08Contact)
- The contact form partials collect first/last name, phone, email, subject, preferred location, message, and the newsletter opt-in before rendering the Submit pill button with an arrow icon.
- Legal copy references Google’s Privacy Policy, Terms, and the “protected by reCAPTCHA” statement. These lines appear in both desktop and mobile versions to keep compliance consistent.
- The form is wired by `public/scripts/layout.js`, so any field changes require verifying the script continues to read the new inputs.

## Additional notes
- Keep `src/scripts/layout.js` + `public/scripts/layout.js` synchronized when you adjust variant behavior or contact form wiring.
- Tailwind refactor and a Payload-first render are planned once the block schema fully matches the iframe partials. Until then, treat this repo as a parity shell with legacy slides powering the experience.

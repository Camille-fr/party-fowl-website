# Party Fowl Next parity build

## Purpose
This repository keeps the legacy Party Fowl homepage intact while letting Next.js own the outer shell, the React-rendered header/footer, the loader skeleton, and the mobile dock. The legacy markup still drives every slide via `public/scripts/slides.js`, so this build is intentionally a parity layer while Payload-ready content slowly replaces the iframe sections.

## Quick start
1. `pnpm install`
2. `pnpm dev:3001`

http://localhost:3001

Note: `pnpm dev -- -p 3001` is intentionally NOT used.

## Tailwind status
- Tailwind is enabled while the legacy CSS bundle remains the source of truth for every homepage pixel to preserve parity.
- Migration rule: migrate one section at a time within its React wrapper, verify parity after each pass, and only then remove that section’s legacy CSS rules.
- Warning: do not delete any legacy CSS until the associated section is fully migrated and confirmed.

## Runtime overview
### React shell responsibilities
- `app/page.tsx` renders `components/home/HomePage`, which emits the loader skeleton, the mobile dock markup, and `<main id="slidesRoot">` for the iframe slides.
- `components/layout/SiteHeader` + `SiteFooter` pull sanitized partials (via `lib/partialLoader.ts`) and render them through `components/shared/VariantSwitch`, keeping `data-layout-managed="next"` on the mounts so `public/scripts/layout.js` never overwrites them on first load.

### Legacy scripts & partials
- `public/scripts/layout.js` (and its `src` counterpart) still re-fetches header/footer variants on resize, wires the contact form, and falls back to legacy markup if React is unavailable.
- `public/scripts/slides.js` (the single source of truth for slide layout) builds the iframe pairs from `public/partials/home/` and keeps sizing, reveal, preload, and media hydration in sync.
- `src/partials/*` remain the editable source; `lib/partialLoader.ts` sanitizes them on startup and mirrors them into `public/partials/`, so restart the dev server after editing any partial.

### Slide loader breakdown
Slide order is defined by the `SLIDES` array inside `public/scripts/slides.js`; each entry pairs a desktop and mobile partial.

| Slide ID | Payload block | Partial files | Role |
| --- | --- | --- | --- |
| `home-01-above-fold` | `Home01AboveFold` | `home-01-above-fold-desktop.html` / `-mobile.html` | Hero video, stacked headline, and top-level CTA messaging. |
| `home-02-social-media-reels` | `Home02SocialReels` | `home-02-social-media-reels-desktop.html` / `-mobile.html` | WHAT’S NEW headline, autoplay reels, and social CTA buttons. |
| `home-03-menu-carousel` | `Home03MenuCarousel` | `home-03-menu-carousel-desktop.html` / `-mobile.html` | MENU HIGHLIGHTS cards, carousel copy, and “Explore Full Menu” CTA. |
| `home-04-catering` | `Home04Catering` | `home-04-catering-desktop.html` / `-mobile.html` | Catering showcase with feature bullets, scripts, and “Explore Catering & Events” CTA. |
| `home-05-the-latest` | `Home05TheLatest` | `home-05-the-latest-desktop.html` / `-mobile.html` | “The Latest” feed with filters, cards, and “See What’s On Near You” CTA. |
| `home-06-cta-section` | `Home06CTA` | `home-06-cta-section-desktop.html` / `-mobile.html` | CTA video, copy, and the Order Now / Find a Location pills that tie to `siteSettings.mobileDock`. |
| `home-08-contact` | `Home08Contact` | `home-08-contact-desktop.html` / `-mobile.html` | Contact form used for planning events; includes fields, subject dropdown, preferred location, and reCAPTCHA/legal copy. |

The reward partials (`home-07-rewards-desktop.html` / `-mobile.html`) still exist in `src/partials/home` + `public/partials/home`, but `slides.js` does not instantiate them yet; keep the files synchronized if you plan to insert that slide later and update the `SLIDES` array accordingly.

### Layout variant management
- `components/shared/VariantSwitch` renders the sanitized partial twice (desktop + mobile) and toggles which iframe variant is shown based on `window.matchMedia('(min-width: 1024px)')`.
- `public/scripts/layout.js` listens for `pfHeaderHeightChange`, dispatches `VariantSwitch` updates, and keeps the dock/button aria labels in sync with `siteSettings.mobileDock`.

## Directory highlights
- `app/`, `components/`, `globals.css`, `next.config.ts`, etc: the Next.js shell that surrounds the legacy partials.
- `public/scripts/`: legacy behavior drivers (`slides.js`, `layout.js`) + `assets/` consumed by both Next and the iframe partials.
- `src/partials/`: editable HTML that `lib/partialLoader.ts` sanitizes before mirroring into `public/partials/`.
- `lib/partialLoader.ts`: caches sanitized partials; restarting the dev server refreshes those copies after edits.
- `docs/`: authority on Payload mapping (`payload-field-map.md`), runtime handoff (`handoff-homepage.md`), and QA/checklist guidance (`dev-checklist.md`).
- `src/README.md`: context on the legacy static source and sync requirements.

## Editing workflow
1. Edit `src/partials/home/*.html` or `src/partials/layout/*.html` whenever you need to tweak copy, imagery, or markup. `lib/partialLoader.ts` sanitizes these files at build time and pushes them into `public/partials/`.
2. Restart the dev server after editing partials because the sanitized copies are cached at startup.
3. Keep `public/scripts/slides.js` and `layout.js` in sync with the `src/scripts/` counterparts if you modify animation behavior, resize hooks, or navigation wiring.
4. Use `docs/payload-field-map.md` to ensure Payload block names and fields align with the partials you edit, especially before the Payload data replaces the iframe markup.

## Documentation index
- `docs/handoff-homepage.md`: runtime shape, slide order, and how React + legacy scripts collaborate.
- `docs/payload-field-map.md`: slide-by-slide field mapping, mobile dock, header/footer, and editorial vs. dev ownership.
- `docs/dev-checklist.md`: step-by-step QA checks, diagnostic pointers, and where to look when things fail.
- `src/README.md`: instructions for keeping the legacy static source and mirrored partials/scripts aligned.

## QA checklist (high-level)
1. Console is clean across React, `slides.js`, and `layout.js`.
2. Network tab has no 404s for assets, partials, or scripts.
3. `#slidesRoot` stays empty until `slides.js` hydrates the iframes.
4. Desktop/mobile variants swap without duplicate slides or layout flashes.
5. Loader skeleton and mobile dock preserve space until the slides render.
6. Header/footer mounts respect `data-layout-managed="next"` and never re-mount.
7. Videos, posters, and CTA icons hydrate once scrolled into view.
8. Payload fields (per `docs/payload-field-map.md`) still match the partials before adjusting them.

## Known limitations and next steps
- React does not yet render slide DOM; the legacy iframe loader still owns every section.
- Any changes to sanitized partials require a dev server restart because of the cached copies in `lib/partialLoader.ts`.
- Tailwind refactor and fully React-rendered slides are planned once the Payload schema fully matches the iframe partials.

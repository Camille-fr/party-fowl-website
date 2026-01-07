# Payload Field Map

This file keeps every homepage `<section>` aligned with the Payload schema so the legacy iframe loader can swap in the same content editors see in Payload. The `SLIDES` array in `public/scripts/slides.js` renders the sections in the exact order shown below, so keep the block handles, file names, and field shapes stable as you edit anything here.

## Slide matrix

| Slide ID | Payload block | Key fields | Partial files |
| --- | --- | --- | --- |
| `home-01-above-fold` | `Home01AboveFold` | Hero kicker, stacked headline lines, hero video + poster, hero accent image, CTA copy/URL | `home-01-above-fold-desktop.html` / `-mobile.html` |
| `home-02-social-media-reels` | `Home02SocialReels` | WHAT’S NEW title, reel cards (poster/video sources, aria label, tags), social CTA buttons (Instagram, Facebook, X) | `home-02-social-media-reels-desktop.html` / `-mobile.html` |
| `home-03-menu-carousel` | `Home03MenuCarousel` | MENU HIGHLIGHTS headlines + subcopy, “Explore Full Menu” CTA, carousel cards (category name, descriptor, hero image, CTA href) | `home-03-menu-carousel-desktop.html` / `-mobile.html` |
| `home-04-catering` | `Home04Catering` | BRING THE PARTY TO YOU headline, feature bullet list, script lines, CTA label + URL, catering video + poster assets | `home-04-catering-desktop.html` / `-mobile.html` |
| `home-05-the-latest` | `Home05TheLatest` | The Latest kicker/title, filter labels, drop cards (title, copy, tags, micro text, image), CTA text/link (“See What’s On Near You”) | `home-05-the-latest-desktop.html` / `-mobile.html` |
| `home-06-cta-section` | `Home06CTA` | CTA subcopy, Order Now / Find a Location buttons with icons, headline video + background image | `home-06-cta-section-desktop.html` / `-mobile.html` |
| `home-08-contact` | `Home08Contact` | Contact form fields (name, phone, email, subject, preferred location, message, opt-in), legal copy, submit pill label | `home-08-contact-desktop.html` / `-mobile.html` |

> The reward partials (`home-07-rewards-desktop.html` / `-mobile.html`) remain synced between `src/partials/home/` and `public/partials/home/`, but `public/scripts/slides.js` does not render them yet. Update the `SLIDES` array and the Payload schema if you plan to reintroduce that section later.

## Slide breakdown

### Home01AboveFold (hero)
- **Markup**: Both breakpoints render the kicker copy “Known for its legendary NASHVILLE HOT CHICKEN…” plus the stacked headline lines `NASHVILLE HOT CHICKEN.`, `BOOZY SLUSHIES.`, `ZERO CHILL.`. The hero video has deferred sources/poster attributes, and the CTA pill sits inside the hero container.
- **Payload fields**: Model kicker text, multi-line headline, hero video + poster uploads, accent image, CTA label and URL. Keep the desktop/mobile asset pairings consistent with `home-01-above-fold-*`.
- **Editing tip**: The hero partial sets `loading="lazy"` on the video source and uses `aria-hidden` for decorative spans; preserve those attributes so `slides.js` can size the iframe without layout jitter.

### Home02SocialReels (socialReels)
- **Markup**: WHAT’S NEW title, a reel matrix with poster/video sources, per-card `aria-label` toggles between Play/Pause, and social buttons for Instagram, Facebook, and X.
- **Payload fields**: Each reel card should expose poster/video uploads, CTA copy, and accessibility labels. Social CTA objects reuse the global CTA shape (label, href, ariaLabel, icon) so the mobile dock and header can share them.
- **Editing tip**: `slides.js` tracks this slide via the `__updateFootprintsProgress` hook; keep the desktop/mobile markup in sync (including data attributes) so the footprints animation continues to work.

### Home03MenuCarousel (menuCarousel)
- **Markup**: MENU HIGHLIGHTS title + subcopy, “Explore Full Menu” CTA, and carousel cards for Brunch, For the Table, Soups & Salads, Nashville Hot Chicken, Not Hot Chicken & Handhelds, Sides, and Tasty Treats linking back to the menu page.
- **Payload fields**: Model carousel cards as an array with `categoryName`, `categoryCopy`, `heroImage`, `targetUrl`, and supporting tags so future React renders can reuse the same structure.
- **Editing tip**: The carousel markup includes `data-` hooks consumed by the legacy script; do not remove or rename those attributes.

### Home04Catering (catering)
- **Markup**: BRING THE PARTY TO YOU headline, feature bullet list, script copy, CTA label + link, and catering video/poster assets.
- **Payload fields**: Headline lines, bullet copy, CTA label, CTA URL, and media references for hero video + poster.
- **Editing tip**: Keep the bullet list structure stable because the legacy script targets the list items for spacing and reveal timing.

### Home05TheLatest (theLatest)
- **Markup**: Kicker “The Latest”, title lines `What’s Hot / Right Now.`, explanatory copy, filter tabs (All, Events, Give & Use, New), drop cards with tags/microtext, and “See What’s On Near You” CTA pointing to the locations page.
- **Payload fields**: Model filters as an array of labels, drop cards as objects containing their copy/tags/image, and CTA text/href.
- **Editing tip**: Filters control `data-active` toggles; keep their handles stable when reorganizing cards.

### Home06CTA (cta)
- **Markup**: Hidden accessible H1 `Don’t Wait — Celebrate!`, subcopy repeating “NASHVILLE HOT CHICKEN, boozy slushies & zero chill…,” and the Order Now / Find a Location pills with matching icons.
- **Payload fields**: Subcopy, CTA objects (label, href, icon, ariaLabel), and hero video/background image references.
- **Editing tip**: CTAs feed into `siteSettings.mobileDock` so keep their variants/ARIA labels consistent with the dock buttons.

### Home07Rewards (rewards) – reserved
- **Markup**: Rewards label, headline `Join the Flock / & Get Rewarded`, tagline “Because the only thing better…,” benefit tiles (Points, Bonus, Redeem, Members, Forever), and the Join Rewards CTA button.
- **Payload fields**: Configure label, headline, tagline, benefit tile array (label, detail, icon), CTA label + href, hero video reference.
- **Status**: These partials exist only for future use; `public/scripts/slides.js` does not instantiate `home-07` yet, so editing them only affects the mirrored files until the slide is reintroduced.

### Home08Contact (contact)
- **Markup**: Eyebrow `Need the party to pop?`, title lines `Get In / Touch`, lead copy about planning events, and the contact form.
- **Payload fields**: First/last name, phone number, email, subject select (General inquiry, Catering, Events, Press, Feedback), preferred location select (Nashville, Murfreesboro), message, opt-in checkbox copy, submit CTA label, and legal copy referencing Google Privacy & Terms.
- **Editing tip**: Preserve the addition of reCAPTCHA copy and legal links on both desktop and mobile partials so the script never misses a required field.

## Globals

### siteSettings (singleton)
- `siteSettings` wires together `header`, `footer`, and the `mobileDock`. Editing this singleton updates the shared layout once both React and the legacy layout loader pick up the sanitized HTML from `src/partials/layout/`.

#### Fields
- `defaultSeo` (group)
  - `seoTitle` (text)
  - `seoDescription` (textarea)
  - `ogImage` (upload image)
- `twitterCard` (select)
- `favicon` (optional upload or existing static path)

#### Mobile dock (`siteSettings.mobileDock`)
- `mobileDock.enabled` toggles the persistent dock so the header’s `globalCtas` remain desktop-only.
- `mobileDock.ctas` (array, typically two objects) shares the CTA shape used across the layout.
  - `label` (text) – button copy visible on the dock.
  - `url` (link) – CTA target, e.g., /locations or /order.
  - `variant` (select) – keeps dock buttons in sync with header CTA styles.
  - `ariaLabel` (text, optional) – overrides visible text for screen readers if needed.
  - `icon` (reference, optional) – mirrors the dock’s icon set.

#### Observed in the static build
- The dock renders as a fixed `.mobile-dock` bar inside `components/home/HomePage.tsx`, wrapping CTA buttons with `dock-btn`, `dock-icon`, and `dock-label` classes.
- `Locations` renders as a `button.dock-btn.dock-btn--locations` with `aria-label="Locations"`.
- `Order Now` renders as a `button.dock-btn.dock-btn--order` with `aria-label="Order Now"`.

### header (singleton)
- **Observed**: Desktop header (`headerdesktop.html`) lists Menu, Catering, Events & Deals, About Us, and pill CTAs (Locations, Order Now). Mobile header (`headermobile.html`) renders the burger action with `aria-label="Menu"` plus the logo link to home.

### footer (singleton)
- **Observed**: Desktop/mobile footers each render the “Menu”, “Explore”, and “Stay in the flock” columns. The newsletter column keeps the Get Updates pill, social links (Instagram, Facebook, X), and the bottom row repeats “(c) 2025 Party Fowl. All Rights Reserved.” with Privacy, Terms, and Accessibility links.

## Content ownership

**Client-editable**
- Copy across hero, slides, rewards, and CTA buttons.
- Images and videos that pair with the hero, carousel, benefits, and CTAs.
- Menu items (carousel cards), filters, and CTA labels/URLs.
- Locations references, social CTAs, and mobile dock CTA definitions.

**Dev-only**
- Animation tuning (scroll reveals, hero tilt, carousel autoplay, neon effects).
- Layout timing (slide spacing, loader duration, iframe sizing, flush vs full-bleed).
- CSS tokens and neon/effect parameters without explicit Payload fields.

## Notes for devs

- The block order above matches the `SLIDES` array in `public/scripts/slides.js`. Keep the handles stable (Home01→Home06, Home08) so the legacy loader renders in the same sequence as the Payload data.
- Each block’s handle maps directly to the partials in `public/partials/home/`. Avoid renaming files or handles unless you update both the Payload schema and the slide loader.
- Preserve the existing IDs/classes emitted by the partials because `slides.js`, `layout.js`, and analytics hooks target them for behavior tweaks.
- See `docs/handoff-homepage.md` for implementation details (partial sanitization, `combinePartials`, and how the scripts interleave with React).

## Payload Modeling Recommendations

### Minimal (parity) setup
- Keep the homepage Pages entry as the flat sequence `Home01AboveFold` → `Home06CTA` (with `Home07Rewards` reserved for future reintroduction) followed by `Home08Contact`. Matching the `SLIDES` order ensures the legacy iframe flow stays stable.
- Mirror the table above so the markup in `public/partials/home/` aligns with the Payload data (copy, media uploads, CTA text/URLs).

### Scalable (Payload-first) setup
- Extend the `HomeXX` blocks with nested arrays/groups only when editorial needs change but keep the outer handles stable.
- Use `siteSettings` for shared layout bits (`header`, `footer`, `mobileDock`) so you do not duplicate content across slides; `components/layout/*` already imports those sanitized partials via `lib/partialLoader.ts`.

### Naming conventions
- Block handles remain PascalCase (`Home03MenuCarousel`) while field names stay camelCase (`heroHeadline`, `filterLabel`, `ctaLink`). This keeps future React renders and Payload migrations predictable.
- Model CTAs as objects with `label`, `href`, `ariaLabel`, and optional `variant`/`icon` so both React and legacy scripts consume a consistent shape.
- For repeating content (carousel cards, benefit tiles, mobile dock CTAs), use arrays of descriptive objects (`categoryName`, `categoryCopy`, `targetUrl`, `image`).

### Media guidance
- Use Payload `upload` fields for hero videos, posters, and icon graphics so editors can swap media without touching the partial HTML.
- When a partial renders breakpoint-specific assets, keep parallel upload fields (e.g., `heroDesktopPoster` + `heroMobilePoster`) and document their roles so the legacy markup and future React renderer stay aligned.
- Always synchronize edits between `src/partials` and `public/partials` so `slides.js` sees the same DOM shape the Payload data produces before the iframe markup swaps in.

- The contact form in `Home08Contact` currently lives outside the parity surface; keep it as a standalone template if you model it later so the core `Home01`–`Home07` flow stays unchanged.

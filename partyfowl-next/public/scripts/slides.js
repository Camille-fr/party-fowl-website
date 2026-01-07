/*
  Slide layout manager for home.html
  - Builds sequential slides from partials (mobile + desktop variants)
  - Ensures first slide is never cut by reserving initial height on its active frame
  - Sizes iframes to exact content height (accounts for images, videos, fonts, fixed elements)
  - Switches variants on viewport change and resizes as needed
*/
(() => {
  'use strict';

  /*
    The ordered list of slide sections that `slides.js` instantiates. Each entry pairs a desktop/mobile partial.
    The rewards slides (`home-07-rewards-*`) still live under `public/partials/home/`, but they are not rendered by this loader yet;
    keep the files synchronized if you reintroduce that section.
  */
  const SLIDES = [
    { id: 'home-01-above-fold', desktop: 'home-01-above-fold-desktop.html', mobile: 'home-01-above-fold-mobile.html' },
    { id: 'home-02-social-media-reels', desktop: 'home-02-social-media-reels-desktop.html', mobile: 'home-02-social-media-reels-mobile.html' },
    { id: 'home-03-menu-carousel', desktop: 'home-03-menu-carousel-desktop.html', mobile: 'home-03-menu-carousel-mobile.html' },
    { id: 'home-04-catering', desktop: 'home-04-catering-desktop.html', mobile: 'home-04-catering-mobile.html' },
    { id: 'home-05-the-latest', desktop: 'home-05-the-latest-desktop.html', mobile: 'home-05-the-latest-mobile.html' },
    { id: 'home-06-cta-section', desktop: 'home-06-cta-section-desktop.html', mobile: 'home-06-cta-section-mobile.html' },
    { id: 'home-08-contact', desktop: 'home-08-contact-desktop.html', mobile: 'home-08-contact-mobile.html' }
  ];

  /*
    Figure out where the partials live (relative to this script, the document, or the origin) so iframe `src` urls resolve.
  */
  let PARTIALS_BASE = (() => {
    const current = document.currentScript;
    if (current && current.src) {
      return new URL('../partials/home/', current.src).toString();
    }
    const fallback = document.querySelector('script[src*="slides.js"]');
    if (fallback && fallback.src) {
      return new URL('../partials/home/', fallback.src).toString();
    }
    return new URL('../partials/home/', window.location.href).toString();
  })();

  async function urlExists(url) {
    try {
      // Some dev servers (or static hosts) don’t support HEAD reliably.
      const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (head.ok) return true;
      if (head.status === 405 || head.status === 403) {
        const get = await fetch(url, { method: 'GET', cache: 'no-store' });
        return !!get.ok;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  async function resolvePartialsBase() {
    const scriptUrl = (() => {
      const cur = document.currentScript;
      if (cur && cur.src) return cur.src;
      const s = document.querySelector('script[src*="slides.js"]');
      return (s && s.src) ? s.src : '';
    })();

    const originRoot = (window.location && window.location.origin) ? (window.location.origin + '/') : '';

    const candidates = [];
    // Most common: relative to slides.js location
    if (scriptUrl) candidates.push(new URL('../partials/home/', scriptUrl).toString());
    // Common in Live Server: relative to the document
    candidates.push(new URL('./partials/home/', document.baseURI).toString());
    candidates.push(new URL('../partials/home/', document.baseURI).toString());
    // Common repo layouts
    if (originRoot) candidates.push(new URL('partials/home/', originRoot).toString());
    if (originRoot) candidates.push(new URL('src/partials/home/', originRoot).toString());

    // De-dupe while preserving order
    const uniq = [];
    const seen = new Set();
    for (const c of candidates) {
      const key = String(c);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(key);
    }

    const testFile = (SLIDES && SLIDES[0] && SLIDES[0].desktop) ? SLIDES[0].desktop : 'home-01-above-fold-desktop.html';
    for (const base of uniq) {
      if (await urlExists(base + testFile)) return base;
    }

    // Fall back to the first candidate so we keep previous behavior.
    return uniq[0] || new URL('./partials/home/', document.baseURI).toString();
  }
  const slidesRoot = document.getElementById('slidesRoot');
  const mqDesktop = window.matchMedia('(min-width: 1024px)');
  const mqReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (_) {}

  const HEADER_EVENT_NAME = 'pfHeaderHeightChange';
  const getHeaderHeight = () => Math.max(0, Math.round(window.__pfHeaderHeight || 0));

  if (!slidesRoot) return;

  const state = {
    slides: [], // { section, fDesktop, fMobile, index }
    fpIndex: null,
    fpTicking: false,
    revealObserver: null,
    loadObserver: null,
    mediaObserver: null,
    nearSlides: new Set()
  };
  const skeletonLayer = document.getElementById('slideSkeleton');
  let skeletonHidden = false;

  function setFrameHeaderHeight(frame, height = getHeaderHeight()) {
    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
      if (!doc || !doc.documentElement) return;
      const value = `${Math.max(0, Math.round(height || 0))}px`;
      doc.documentElement.style.setProperty('--pf-header-height', value);
      if (doc.body) doc.body.style.setProperty('--pf-header-height', value);
    } catch (_) {
      // ignore
    }
  }

  function syncHeaderHeightToAllFrames() {
    state.slides.forEach(({ fDesktop, fMobile }) => {
      setFrameHeaderHeight(fDesktop);
      setFrameHeaderHeight(fMobile);
    });
  }

  function removeSlideSkeleton() {
    if (skeletonHidden || !skeletonLayer) return;
    skeletonHidden = true;
    skeletonLayer.classList.add('is-hidden');
    skeletonLayer.addEventListener('transitionend', () => {
      if (skeletonLayer.parentNode) {
        skeletonLayer.parentNode.removeChild(skeletonLayer);
      }
    }, { once: true });
  }

  function maybeHideSlideSkeleton(frame) {
    if (skeletonHidden || !frame) return;
    const first = state.slides[0];
    if (!first) return;
    if (frame === first.fDesktop || frame === first.fMobile) {
      removeSlideSkeleton();
    }
  }

  // Utilities
  const isDesktop = () => mqDesktop.matches;
  const motionAllowed = () => !(mqReduceMotion && mqReduceMotion.matches);
  const toPx = (n) => `${Math.max(0, Math.ceil(n))}px`;
  const FRAME_SCROLL_BUFFER = 0;

  // Slides that render full-bleed sections so we can toggle the proper layout class.
  const FULLBLEED_SLIDES = new Set([
    'home-01-above-fold',
    'home-02-social-media-reels',
    'home-03-menu-carousel',
    'home-04-catering',
    'home-05-the-latest',
    'home-06-cta-section',
    'home-08-contact'
  ]);

  // Slides that should flush against the gutter instead of gaining extra outer padding.
  const FLUSH_SLIDES = new Set([
    'home-01-above-fold',
    'home-03-menu-carousel',
    'home-04-catering'
  ]);

  const afterPaint = (cb) => {
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (fn) => window.setTimeout(fn, 16);
    raf(() => raf(() => cb()));
  };

  const runIdle = (cb, timeoutMs = 1200) => {
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(cb, { timeout: timeoutMs });
    }
    return window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), Math.min(250, timeoutMs));
  };

  function hydrateDeferredVideoSources(video, options = {}) {
    if (!video) return false;
    const { autoplayIfPossible = false } = options;
    const reduceMotion = !motionAllowed();
    const wantsAutoplay = !!(video.hasAttribute('autoplay') || video.dataset?.autoplay === '1');

    if (reduceMotion && wantsAutoplay) {
      try { video.pause(); } catch (_) {}
      return false;
    }

    let touched = false;
    const dataSrc = video.getAttribute('data-src') || video.dataset?.src;
    if (dataSrc && !video.getAttribute('src')) {
      try {
        video.setAttribute('src', dataSrc);
        video.removeAttribute('data-src');
        if (video.dataset) delete video.dataset.src;
        touched = true;
      } catch (_) {}
    }

    const sources = Array.from(video.querySelectorAll('source[data-src]'));
    sources.forEach((source) => {
      const src = source.getAttribute('data-src');
      if (!src) return;
      if (source.getAttribute('src')) return;
      try {
        source.setAttribute('src', src);
        source.removeAttribute('data-src');
        touched = true;
      } catch (_) {}
    });

    if (touched) {
      try { video.load(); } catch (_) {}
    }

    if (!reduceMotion && autoplayIfPossible && wantsAutoplay) {
      try {
        video.muted = true;
        video.playsInline = true;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }

    return touched;
  }

  function hydrateFrameMedia(frame, options = {}) {
    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
      if (!doc || doc.readyState !== 'complete') return;
      const autoplayIfPossible = !!options.autoplayIfPossible;
      const videos = Array.from(doc.querySelectorAll('video[data-src], video source[data-src]'))
        .map((node) => (node.tagName === 'VIDEO' ? node : node.closest('video')))
        .filter(Boolean);
      videos.forEach((v) => hydrateDeferredVideoSources(v, { autoplayIfPossible }));
    } catch (_) {
      // ignore
    }
  }

  function getSlideIdFromFrame(frame) {
    const section = frame?.closest?.('.slide');
    return section?.dataset?.slideId || '';
  }

  function applyImageGuidance(frame, doc, preferLazy = true) {
    if (!doc) return;
    const images = Array.from(doc.images || []);
    images.forEach((img) => {
      if (preferLazy && !img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
      const setIntrinsic = () => {
        const hasWidth = img.hasAttribute('width');
        const hasHeight = img.hasAttribute('height');
        if (hasWidth && hasHeight) return;
        const w = Math.round(img.naturalWidth || img.width || 0);
        const h = Math.round(img.naturalHeight || img.height || 0);
        if (w > 0 && h > 0) {
          if (!hasWidth) img.setAttribute('width', w);
          if (!hasHeight) img.setAttribute('height', h);
        }
      };
      setIntrinsic();
      if (!img.complete) {
        img.addEventListener('load', () => {
          setIntrinsic();
          scheduleSize(frame);
        }, { once: true });
      }
    });
  }

  function applyVideoGuidance(doc) {
    if (!doc) return;
    const videos = Array.from(doc.querySelectorAll('video'));
    videos.forEach((video) => {
      if (!video.hasAttribute('preload')) {
        video.setAttribute('preload', 'metadata');
      }
      video.playsInline = true;
      if (!video.hasAttribute('playsinline')) {
        video.setAttribute('playsinline', '');
      }
      const poster = video.getAttribute('data-poster') || video.dataset?.poster;
      if (poster && !video.getAttribute('poster')) {
        video.setAttribute('poster', poster);
      }
    });
  }

  function applyFrameMediaHints(frame) {
    if (!frame) return;
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;
    const slideId = getSlideIdFromFrame(frame);
    applyImageGuidance(frame, doc, slideId !== 'home-01-above-fold');
    applyVideoGuidance(doc);
  }

  function pauseFrameVideos(frame) {
    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
      if (!doc || doc.readyState !== 'complete') return;
      const videos = Array.from(doc.querySelectorAll('video'));
      videos.forEach((video) => {
        try { video.pause(); } catch (_) {}
      });
    } catch (_) {
      // ignore
    }
  }

  function resumeFrameAutoplayVideos(frame) {
    if (!frame || !motionAllowed()) return;
    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
      if (!doc || doc.readyState !== 'complete') return;
      const videos = Array.from(doc.querySelectorAll('video[autoplay]'));
      videos.forEach((video) => {
        try {
          video.muted = true;
          video.playsInline = true;
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
      });
    } catch (_) {
      // ignore
    }
  }

  function sectionIsInViewport(section) {
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.bottom > 0 && rect.top < vh;
  }

  function primeFrameMedia(frame) {
    if (!frame || !frame.__srcActivated) return;
    const section = frame.closest('.slide');
    if (!section) return;
    const active = activeFrameFor(section) === frame;
    if (!active) return;

    const slideId = section.dataset?.slideId || '';

    // Hero: defer video source until after first paint/idle for a fast first render.
    if (slideId === 'home-01-above-fold') {
      if (frame.__heroMediaPrimed) return;
      frame.__heroMediaPrimed = true;
      afterPaint(() => {
        runIdle(() => hydrateFrameMedia(frame, { autoplayIfPossible: true }), 1600);
      });
      return;
    }

    if (sectionIsInViewport(section)) {
      hydrateFrameMedia(frame, { autoplayIfPossible: true });
    }
  }

  function primeFrameInteractiveState(frame) {
    if (!frame || !frame.__srcActivated) return;
    const section = frame.closest('.slide');
    if (!section) return;
    if (activeFrameFor(section) !== frame) return;

    const slideId = section.dataset?.slideId || '';
    if (slideId !== 'home-03-menu-carousel') return;

    try {
      const win = frame.contentWindow;
      if (win && typeof win.__setMenuCarouselAuto === 'function') {
        win.__setMenuCarouselAuto(sectionIsInViewport(section) && motionAllowed());
      }
    } catch (_) {}
  }

  function activateFrame(frame, options = {}) {
    if (!frame) return;
    const { eager = false } = options;
    const src = frame.getAttribute('data-src') || frame.dataset?.src;
    if (!src) return;
    if (frame.__srcActivated) return;
    frame.__srcActivated = true;
    try {
      frame.loading = eager ? 'eager' : 'lazy';
    } catch (_) {}
    try {
      frame.setAttribute('src', src);
    } catch (_) {}
  }

  function activateActiveVariant(section, options = {}) {
    const frame = activeFrameFor(section);
    if (!frame) return;
    activateFrame(frame, options);
    // Seed a reasonable height so layout doesn't collapse before load completes.
    if (!frame.__lastHeight) {
      const viewportSeed = Math.max((window.innerHeight || 0) - getHeaderHeight(), 320);
      const seed = Math.max(320, Math.min(1400, Math.max(viewportSeed, 600)));
      frame.style.height = toPx(seed);
      frame.style.visibility = 'visible';
    }
  }

  function setupSlideLoadingObserver() {
    if (state.loadObserver) {
      state.loadObserver.disconnect();
      state.loadObserver = null;
    }

    const preloadPx = isDesktop() ? 1400 : 1100;
    const rootMargin = `${preloadPx}px 0px ${preloadPx}px 0px`;

    if (typeof IntersectionObserver === 'undefined') {
      // Old browsers: load sequentially after the first slide.
      const idle = window.requestIdleCallback
        ? window.requestIdleCallback.bind(window)
        : (cb) => window.setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 250);
      const queue = state.slides.slice(1).map((s) => s.section);
      const drain = () => {
        const next = queue.shift();
        if (!next) return;
        activateActiveVariant(next);
        idle(drain);
      };
      idle(drain);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target;
        if (entry.isIntersecting) {
          state.nearSlides.add(section);
          activateActiveVariant(section);
        } else {
          state.nearSlides.delete(section);
        }
      });
    }, { root: null, rootMargin, threshold: 0.01 });

    state.slides.forEach(({ section }) => observer.observe(section));
    state.loadObserver = observer;
  }

  function setupSlideMediaObserver() {
    if (state.mediaObserver) {
      state.mediaObserver.disconnect();
      state.mediaObserver = null;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target;
        const slideId = section.dataset?.slideId || '';
        const frame = activeFrameFor(section);
        const hiddenFrame = inactiveFrameFor(section);

        if (hiddenFrame && hiddenFrame.__srcActivated) {
          pauseFrameVideos(hiddenFrame);
          try {
            const win = hiddenFrame.contentWindow;
            if (slideId === 'home-03-menu-carousel' && win && typeof win.__setMenuCarouselAuto === 'function') {
              win.__setMenuCarouselAuto(false);
            }
          } catch (_) {}
        }

        if (entry.isIntersecting) {
          if (!frame || !frame.__srcActivated) return;
          if (slideId !== 'home-01-above-fold') {
            hydrateFrameMedia(frame, { autoplayIfPossible: true });
          } else {
            // Hero is hydrated after first paint/idle via `primeFrameMedia`.
            primeFrameMedia(frame);
          }
          resumeFrameAutoplayVideos(frame);
          try {
            const win = frame.contentWindow;
            if (slideId === 'home-03-menu-carousel' && win && typeof win.__setMenuCarouselAuto === 'function') {
              win.__setMenuCarouselAuto(!!motionAllowed());
            }
          } catch (_) {}
        } else {
          if (frame && frame.__srcActivated) pauseFrameVideos(frame);
          if (hiddenFrame && hiddenFrame.__srcActivated) pauseFrameVideos(hiddenFrame);
          try {
            const win = frame && frame.contentWindow;
            if (slideId === 'home-03-menu-carousel' && win && typeof win.__setMenuCarouselAuto === 'function') {
              win.__setMenuCarouselAuto(false);
            }
          } catch (_) {}
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.12 });

    state.slides.forEach(({ section }) => observer.observe(section));
    state.mediaObserver = observer;
  }
  function computeDocHeight(doc) {
    const body = doc.body;
    const html = doc.documentElement;
    if (!body || !html) return 0;
    try {
      const root = doc.querySelector('[data-pf-slide-root="true"], [data-pf-slide-root="1"], [data-pf-slide-root]');
      if (root) {
        const rect = root.getBoundingClientRect();
        const h = Math.max(
          rect ? rect.height : 0,
          root.scrollHeight || 0,
          root.offsetHeight || 0,
          root.clientHeight || 0
        );
        if (h > 0) return Math.ceil(h);
      }
    } catch (_) {
      // ignore
    }
    // Prefer scrollHeight/offsetHeight; avoid +1px which can trigger feedback loops
    const h = Math.max(
      html.scrollHeight,
      body.scrollHeight,
      html.offsetHeight,
      body.offsetHeight,
      html.clientHeight,
      body.clientHeight
    );
    return Math.ceil(h);
  }

  function getTargetContentHeight(frame, doc) {
    try {
      if (!frame || !doc) return 0;
      const section = frame.closest('.slide');
      if (!section || section.dataset.slideId !== 'home-06-cta-section') return 0;
      const target = doc.querySelector('.cta');
      if (!target) return 0;
      const rect = target.getBoundingClientRect();
      const h = Math.ceil(rect.height);
      return h > 0 ? h : 0;
    } catch (_) {
      return 0;
    }
  }

  function scheduleSize(frame) {
    if (frame.__sizeScheduled) return;
    frame.__sizeScheduled = true;
    (frame.ownerDocument.defaultView || window).requestAnimationFrame(() => {
      frame.__sizeScheduled = false;
      sizeFrame(frame);
    });
  }

  function sizeFrame(frame) {
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;
      const special = getTargetContentHeight(frame, doc);
      const raw = special || computeDocHeight(doc);
      const parentWin = frame.ownerDocument && frame.ownerDocument.defaultView
        ? frame.ownerDocument.defaultView
        : window;
      const documentEl = parentWin.document && parentWin.document.documentElement;
      const viewportHeight = Math.max(
        0,
        parentWin.innerHeight || (documentEl && documentEl.clientHeight) || 0
      );
      const buffered = (raw || 0) + FRAME_SCROLL_BUFFER;
      const h = buffered > 0 ? buffered : viewportHeight;
      if (h > 0) {
        const prev = typeof frame.__lastHeight === 'number' ? frame.__lastHeight : 0;
        if (Math.abs(h - prev) > 1) {
          frame.style.height = toPx(h);
          frame.__lastHeight = h;
          if (isFootprintsFrame(frame)) updateFootprintsDriver();
        }
      }
      frame.classList.add('is-ready');
      frame.style.visibility = 'visible';
    } catch (_) {
      // ignore
    }
  }

  function prepareFrame(frame) {
    scheduleSize(frame);
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) return;
      setFrameHeaderHeight(frame);
      applyFrameMediaHints(frame);

      // Re-size on media load
      (Array.from(doc.images) || []).forEach((img) => {
        if (img.complete) return; // will already be accounted for
        img.addEventListener('load', () => scheduleSize(frame));
        img.addEventListener('error', () => scheduleSize(frame));
      });
      (Array.from(doc.querySelectorAll('video')) || []).forEach((v) => {
        v.addEventListener('loadedmetadata', () => scheduleSize(frame));
        v.addEventListener('loadeddata', () => scheduleSize(frame));
        v.addEventListener('canplay', () => scheduleSize(frame));
      });
      if (doc.fonts && doc.fonts.ready) {
        doc.fonts.ready.then(() => scheduleSize(frame)).catch(() => {});
      }

      // Avoid continuous ResizeObserver on the iframe document to prevent feedback loops

      // Brief polling to stabilize early layout without long-running loops
      let ticks = 0;
      const iv = setInterval(() => {
        scheduleSize(frame);
        if (++ticks > 3) clearInterval(iv);
      }, 350);
      maybeHideSlideSkeleton(frame);
      primeFrameMedia(frame);
      primeFrameInteractiveState(frame);
    } catch (_) {
      // ignore
    }
  }

  function activeFrameFor(section) {
    if (!section) return null;
    return isDesktop()
      ? (section.querySelector('.pf-only-desktop') || section.querySelector('.view-desktop'))
      : (section.querySelector('.pf-only-mobile') || section.querySelector('.view-mobile'));
  }

  function inactiveFrameFor(section) {
    if (!section) return null;
    return isDesktop()
      ? (section.querySelector('.pf-only-mobile') || section.querySelector('.view-mobile'))
      : (section.querySelector('.pf-only-desktop') || section.querySelector('.view-desktop'));
  }

  function getFootprintsFrame(entry) {
    if (!entry || !entry.section) return null;
    const primary = activeFrameFor(entry.section);
    const secondary = inactiveFrameFor(entry.section);
    const hasApi = (frame) => {
      try {
        const win = frame && frame.contentWindow;
        return !!(win && typeof win.__updateFootprintsProgress === 'function');
      } catch (_) {
        return false;
      }
    };
    const isVisible = (frame) => {
      if (!frame) return false;
      const style = window.getComputedStyle(frame);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = frame.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0;
    };
    const primaryVisible = isVisible(primary);
    const secondaryVisible = isVisible(secondary);
    if (primaryVisible && hasApi(primary)) return primary;
    if (secondaryVisible && hasApi(secondary)) return secondary;
    if (hasApi(primary)) return primary;
    if (hasApi(secondary)) return secondary;
    return primary || secondary || null;
  }

  function isFootprintsFrame(frame) {
    try {
      if (!frame || state.fpIndex == null) return false;
      const entry = state.slides[state.fpIndex];
      if (!entry) return false;
      return activeFrameFor(entry.section) === frame;
    } catch (_) {
      return false;
    }
  }

  // Preserve user's scroll position relative to the current section during variant switches
  function getViewportAnchor() {
    const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    let bestIndex = 0;
    let bestDelta = Infinity;
    state.slides.forEach(({ section }, i) => {
      const top = section.offsetTop;
      const delta = Math.abs(top - y);
      if (top <= y ? (y - top < bestDelta) : (delta < bestDelta)) {
        bestDelta = top <= y ? (y - top) : delta;
        bestIndex = i;
      }
    });
    const section = state.slides[bestIndex] ? state.slides[bestIndex].section : null;
    const sectionTop = section ? section.offsetTop : 0;
    const offsetPx = Math.max(0, y - sectionTop);
    const ratio = section && section.offsetHeight > 0 ? Math.min(1, offsetPx / section.offsetHeight) : 0;
    return { index: bestIndex, offsetPx, ratio };
  }

  function restoreViewportAnchor(anchor) {
    if (!anchor) return;
    const entry = state.slides[anchor.index];
    if (!entry) return;
    const { section } = entry;
    const target = section.offsetTop + Math.max(0, Math.round(anchor.offsetPx));
    try {
      window.scrollTo({ top: target, behavior: 'auto' });
    } catch (_) {
      window.scrollTo(0, target);
    }
  }

  function setupSlideReveals() {
    if (state.revealObserver) {
      state.revealObserver.disconnect();
      state.revealObserver = null;
    }

    const DELAY_CAP = 0.35;
    state.slides.forEach(({ section }, idx) => {
      const delay = Math.min(idx * 0.06, DELAY_CAP);
      section.style.setProperty('--reveal-delay', `${delay}s`);
      if (idx === 0) {
        section.classList.add('is-visible');
      }
    });

    if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
      state.slides.forEach(({ section }) => section.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('is-visible');
        observer.unobserve(target);
      });
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.2 });

    state.slides.forEach(({ section }) => observer.observe(section));
    state.revealObserver = observer;
  }

  window.addEventListener(HEADER_EVENT_NAME, () => {
    syncHeaderHeightToAllFrames();
    sizeVisibleFrames();
  });

  function updateActiveVariant(section) {
    const a = activeFrameFor(section);
    const i = inactiveFrameFor(section);
    // Pre-seed active frame height to avoid collapse when switching variant
    if (a) {
      const known = typeof a.__lastHeight === 'number' ? a.__lastHeight : 0;
      const fallback = i && typeof i.__lastHeight === 'number' ? i.__lastHeight : 0;
      if (known && known > 0) {
        a.style.height = toPx(known);
      } else {
        const seed = Math.max(fallback || 0, Math.min(1200, Math.max(window.innerHeight || 0, 320)));
        a.style.height = toPx(seed);
      }
      // Ensure active frame is visible while we await exact sizing
      a.style.visibility = 'visible';
    }
    if (i) {
      i.style.height = '0px';
      i.style.visibility = 'hidden';
      i.style.display = 'none';
      i.classList.remove('is-ready');
    }
    if (a) {
      a.style.display = 'block';
      // If already loaded, size now; otherwise the load handler will size
      if (a.__srcActivated) {
        try {
          const doc = a.contentDocument || a.contentWindow.document;
          if (doc && doc.readyState === 'complete') {
            scheduleSize(a);
          }
        } catch (_) {}
      }
    }
  }

  function buildSlides() {
    SLIDES.forEach((s, index) => {
      const section = document.createElement('section');
      section.className = `slide pf-slide pf-slide--${s.id}`;
      if (FULLBLEED_SLIDES.has(s.id)) section.classList.add('pf-slide--fullbleed');
      if (FLUSH_SLIDES.has(s.id)) section.classList.add('pf-slide--flush');
      if (s.id === 'home-08-contact') section.id = 'contact';
      section.dataset.slideId = s.id;
      section.dataset.slideIndex = String(index);
      section.style.setProperty('--reveal-delay', '0s');
      if (index === 0) {
        section.classList.add('is-visible');
      }

      const container = document.createElement('div');
      container.className = 'pf-container';

      const fDesktop = document.createElement('iframe');
      fDesktop.className = 'slide-frame view-desktop pf-only-desktop';
      fDesktop.setAttribute('title', `${s.id} (desktop)`);
      fDesktop.setAttribute('scrolling', 'no');
      fDesktop.loading = 'lazy';
      fDesktop.setAttribute('data-src', PARTIALS_BASE + s.desktop);
      fDesktop.style.height = '0px';
      fDesktop.style.overflow = 'hidden';
      fDesktop.style.visibility = 'hidden';
      fDesktop.__variant = 'desktop';

      const fMobile = document.createElement('iframe');
      fMobile.className = 'slide-frame view-mobile pf-only-mobile';
      fMobile.setAttribute('title', `${s.id} (mobile)`);
      fMobile.setAttribute('scrolling', 'no');
      fMobile.loading = 'lazy';
      fMobile.setAttribute('data-src', PARTIALS_BASE + s.mobile);
      fMobile.style.height = '0px';
      fMobile.style.overflow = 'hidden';
      fMobile.style.visibility = 'hidden';
      fMobile.__variant = 'mobile';

      container.appendChild(fDesktop);
      container.appendChild(fMobile);
      section.appendChild(container);
      slidesRoot.appendChild(section);

      // Auto-size when content loads
      fDesktop.addEventListener('load', () => {
        if (!fDesktop.__srcActivated) return;
        prepareFrame(fDesktop);
        updateFootprintsDriver();
        maybeHideSlideSkeleton(fDesktop);
      });
      fMobile.addEventListener('load', () => {
        if (!fMobile.__srcActivated) return;
        prepareFrame(fMobile);
        updateFootprintsDriver();
        maybeHideSlideSkeleton(fMobile);
      });

      // Reserve space for the first visible variant to prevent initial jump and start loading it.
      if (index === 0) {
        const initial = isDesktop() ? fDesktop : fMobile;
        const headerHeight = getHeaderHeight();
        initial.style.height = `${Math.max((window.innerHeight || 0) - headerHeight, 320)}px`;
        initial.style.visibility = 'visible';
        activateFrame(initial, { eager: true });
      }

      state.slides.push({ section, fDesktop, fMobile, index });

      if (s.id === 'home-02-social-media-reels') {
        state.fpIndex = index;
      }
    });
  }

  function sizeVisibleFrames() {
    state.slides.forEach(({ section }) => {
      updateActiveVariant(section);
    });
    syncHeaderHeightToAllFrames();
  }

  function onResize() {
    sizeVisibleFrames();
    clearTimeout(window.__slidesReflow);
    window.__slidesReflow = setTimeout(sizeVisibleFrames, 200);
    updateFootprintsDriver();
  }

  function updateFootprintsDriver() {
    if (state.fpTicking) return;
    state.fpTicking = true;
    (window.requestAnimationFrame || setTimeout)(() => {
      state.fpTicking = false;
      try {
        if (state.fpIndex == null) return;
        const entry = state.slides[state.fpIndex];
        if (!entry) return;
        const frame = getFootprintsFrame(entry);
        if (!frame) return;
        const win = frame.contentWindow;
        if (!win || typeof win.__updateFootprintsProgress !== 'function') return;

        const rect = entry.section.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!vh) return;

        let sectionTop = rect.top;
        let sectionHeight = rect.height || frame.__lastHeight || 0;
        let speed = 1.25;
        let startTopRatio = 0.88;
        try {
          const metrics = typeof win.__getFootprintsMetrics === 'function' ? win.__getFootprintsMetrics() : null;
          if (metrics && typeof metrics.topOffset === 'number' && typeof metrics.height === 'number') {
            sectionTop = rect.top + metrics.topOffset;
            if (metrics.height > 0) sectionHeight = metrics.height;
          }
          const cfg = win.__footprintsConfig || null;
          if (cfg) {
            if (Number.isFinite(cfg.speed)) speed = cfg.speed;
            if (Number.isFinite(cfg.startTopRatio)) startTopRatio = cfg.startTopRatio;
          }
        } catch (_) {}

        if (!Number.isFinite(sectionHeight) || sectionHeight <= 1) {
          sectionHeight = rect.height || frame.__lastHeight || vh || 1;
        }
        if (!Number.isFinite(sectionTop)) sectionTop = rect.top || 0;

        const startTop = vh * startTopRatio;
        const endTop = vh - sectionHeight;
        const total = (startTop - endTop) || 1;
        let p = ((startTop - sectionTop) / total) * speed;
        if (!isFinite(p)) p = 0;
        p = Math.max(0, Math.min(1, p));
        win.__updateFootprintsProgress(p);
      } catch (_) {}
    });
  }

  async function init() {
    // Live Server can serve home.html from a different folder than slides.js.
    // Resolve the correct partials base so all slide iframes load.
    PARTIALS_BASE = await resolvePartialsBase();
    buildSlides();
    sizeVisibleFrames();
    setupSlideReveals();
    setupSlideLoadingObserver();
    setupSlideMediaObserver();
    if (!window.__pfHashHandled) {
      const hash = (window.location && window.location.hash) ? window.location.hash.trim() : '';
      if (hash && hash !== '#') {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          window.__pfHashHandled = true;
          setTimeout(() => {
            try {
              target.scrollIntoView({ behavior: 'auto', block: 'start' });
            } catch (_) {
              target.scrollIntoView();
            }
          }, 0);
        }
      }
    }

    function onViewportModeChange() {
      const anchor = getViewportAnchor();
      // Switch variants with seeded heights to keep layout stable
      state.slides.forEach(({ section }) => updateActiveVariant(section));
      // Ensure the active variant near the viewport is loaded after switching.
      if (state.nearSlides && state.nearSlides.size) {
        state.nearSlides.forEach((section) => activateActiveVariant(section, { eager: true }));
      } else {
        activateActiveVariant(state.slides[anchor.index]?.section, { eager: true });
      }
      sizeVisibleFrames();
      setupSlideReveals();
      // Restore the viewport anchor after heights settle
      setTimeout(() => { sizeVisibleFrames(); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 60);
      setTimeout(() => { sizeVisibleFrames(); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 160);
      setTimeout(() => { sizeVisibleFrames(); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 320);
    }

    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onViewportModeChange);
    else if (mqDesktop.addListener) mqDesktop.addListener(onViewportModeChange);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateFootprintsDriver, { passive: true });

    window.addEventListener('load', () => {
      // Re-evaluate visible frames a few times while assets settle
      let passes = 0;
      const iv = setInterval(() => {
        sizeVisibleFrames();
        updateFootprintsDriver();
        if (++passes >= 5) clearInterval(iv);
      }, 300);
    });
  }

  // Kick off once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

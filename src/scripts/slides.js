/*
  Slide layout manager for home.html
  - Builds sequential slides from partials (mobile + desktop variants)
  - Ensures first slide is never cut by reserving initial height on its active frame
  - Sizes iframes to exact content height (accounts for images, videos, fonts, fixed elements)
  - Switches variants on viewport change and resizes as needed
*/
(() => {
  'use strict';

  const SLIDES = [
    { id: 'home-01-above-fold', desktop: 'home-01-above-fold-desktop.html', mobile: 'home-01-above-fold-mobile.html' },
    { id: 'home-02-social-media-reels', desktop: 'home-02-social-media-reels-desktop.html', mobile: 'home-02-social-media-reels-mobile.html' },
    { id: 'home-03-menu-carousel', desktop: 'home-03-menu-carousel-desktop.html', mobile: 'home-03-menu-carousel-mobile.html' },
    { id: 'home-04-catering', desktop: 'home-04-catering-desktop.html', mobile: 'home-04-catering-mobile.html' },
    { id: 'home-05-the-latest', desktop: 'home-05-the-latest-desktop.html', mobile: 'home-05-the-latest-mobile.html' },
    { id: 'home-06-cta-section', desktop: 'home-06-cta-section-desktop.html', mobile: 'home-06-cta-section-mobile.html' },
    { id: 'home-07-rewards', desktop: 'home-07-rewards-desktop.html', mobile: 'home-07-rewards-mobile.html' }
  ];

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
  const mqDesktop = window.matchMedia('(min-width: 900px)');
  const mqReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (_) {}

  if (!slidesRoot) return;

  const state = {
    slides: [], // { section, fDesktop, fMobile, index }
    fpIndex: null,
    fpTicking: false,
    parallaxTicking: false,
    revealObserver: null
  };
  const skeletonLayer = document.getElementById('slideSkeleton');
  let skeletonHidden = false;

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
  const isLoaded = (frame) => {
    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
      return !!(doc && doc.readyState === 'complete');
    } catch (_) {
      return false;
    }
  };
  const FRAME_SCROLL_BUFFER = 0;
  const nowMs = () => {
    try {
      return window.performance && window.performance.now ? window.performance.now() : Date.now();
    } catch (_err) {
      return Date.now();
    }
  };
  const scrollVelocityState = {
    lastY: window.scrollY || window.pageYOffset || 0,
    lastTime: nowMs(),
    resetTimeout: 0
  };
  const setScrollVelocity = (value) => {
    try {
      document.documentElement.style.setProperty('--scroll-velocity', value.toFixed ? value.toFixed(3) : String(value));
    } catch (_err) {
      // ignore if DOM not ready
    }
  };

  function trackScrollVelocity() {
    if (!motionAllowed()) {
      setScrollVelocity(0);
      return;
    }
    const now = nowMs();
    const y = window.scrollY || window.pageYOffset || 0;
    const delta = Math.max(16, now - scrollVelocityState.lastTime);
    const distance = Math.abs(y - scrollVelocityState.lastY);
    const ratio = distance / delta;
    const speed = Math.min(1, ratio * 1.35);
    scrollVelocityState.lastY = y;
    scrollVelocityState.lastTime = now;
    setScrollVelocity(speed);
    if (scrollVelocityState.resetTimeout) window.clearTimeout(scrollVelocityState.resetTimeout);
    scrollVelocityState.resetTimeout = window.setTimeout(() => setScrollVelocity(0), 140);
  }

  function getParentScrollDriver(doc) {
    try {
      const win = doc && doc.defaultView;
      if (!win) return null;
      if (win.__parentScrollDriver) return win.__parentScrollDriver;
      const parentWin = win.parent;
      if (!parentWin || parentWin === win) return null;

      const raf = parentWin.requestAnimationFrame
        ? parentWin.requestAnimationFrame.bind(parentWin)
        : (cb) => parentWin.setTimeout(cb, 16);
      const caf = parentWin.cancelAnimationFrame
        ? parentWin.cancelAnimationFrame.bind(parentWin)
        : parentWin.clearTimeout.bind(parentWin);
      const now = () => {
        try {
          return parentWin.performance && parentWin.performance.now
            ? parentWin.performance.now()
            : Date.now();
        } catch (_) {
          return Date.now();
        }
      };

      let rafId = 0;
      let velocity = 0;
      let lastTime = 0;
      const stopThreshold = 0.4;

      const scrollBy = (delta) => {
        if (!delta) return;
        try {
          parentWin.scrollBy({ top: delta, left: 0, behavior: 'auto' });
        } catch (_) {
          try { parentWin.scrollBy(0, delta); } catch (_) {}
        }
      };

      const record = (delta) => {
        const t = now();
        const dt = Math.max(8, t - (lastTime || t));
        velocity = (delta / dt) * 16;
        lastTime = t;
      };

      const cancel = () => {
        if (rafId) caf(rafId);
        rafId = 0;
        velocity = 0;
        lastTime = 0;
      };

      const start = () => {
        if (rafId || Math.abs(velocity) < stopThreshold) return;
        const step = () => {
          velocity *= 0.92;
          if (Math.abs(velocity) < stopThreshold) {
            rafId = 0;
            return;
          }
          scrollBy(velocity);
          rafId = raf(step);
        };
        rafId = raf(step);
      };

      win.__parentScrollDriver = { scrollBy, record, start, cancel };
      return win.__parentScrollDriver;
    } catch (_) {
      return null;
    }
  }

  function ensureNoInnerVerticalScroll(doc) {
    try {
      if (!doc || !doc.head) return;
      if (doc.getElementById('no-inner-vertical-scroll')) return;
      const style = doc.createElement('style');
      style.id = 'no-inner-vertical-scroll';
      style.textContent = `
        html, body { overflow-y: hidden !important; }
      `;
      doc.head.appendChild(style);
    } catch (_) {
      // ignore
    }
  }

  function enableTouchHorizontalScroll(doc) {
    try {
      const win = doc && doc.defaultView;
      if (!win || !('PointerEvent' in win)) return;
      const scrollers = Array.from(doc.querySelectorAll('[data-scroll-x]'));
      if (!scrollers.length) return;
      const parentDriver = getParentScrollDriver(doc);
      scrollers.forEach((el) => {
        if (!el || el.__hScrollTouch) return;
        el.__hScrollTouch = true;
        // Allow vertical page scrolling on touch while we handle horizontal drag manually.
        el.style.touchAction = 'pan-y';

        let active = false;
        let lock = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let pid = null;
        const threshold = 8;

        const onDown = (e) => {
          if (e.pointerType && e.pointerType !== 'touch') return;
          if (e.isPrimary === false) return;
          active = true;
          lock = null;
          pid = e.pointerId;
          startX = e.clientX;
          startY = e.clientY;
          startLeft = el.scrollLeft;
          if (parentDriver) parentDriver.cancel();
        };

        const onMove = (e) => {
          if (!active) return;
          if (pid != null && e.pointerId !== pid) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const ax = Math.abs(dx);
          const ay = Math.abs(dy);

          if (lock === null) {
            // Be stricter before locking to horizontal so we don't block vertical page scroll
            if (ax > ay + threshold * 1.5) lock = 'x';
            else if (ay > ax + threshold) lock = 'y';
            else return;
          }

          // If the user changes intent to vertical, release the horizontal lock
          if (lock === 'x' && ay > ax + threshold) {
            lock = 'y';
          }

          if (lock !== 'x') return;
          e.preventDefault();
          el.scrollLeft = startLeft - dx;
        };

        const onEnd = () => {
          active = false;
          lock = null;
          pid = null;
        };

        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove, { passive: false });
        el.addEventListener('pointerup', onEnd);
        el.addEventListener('pointercancel', onEnd);
        el.addEventListener('lostpointercapture', onEnd);
      });
    } catch (_) {
      // ignore
    }
  }
  function enableParentWheelScroll(doc) {
    try {
      const win = doc && doc.defaultView;
      if (!win || win.__parentWheelScroll) return;
      const parentWin = win.parent;
      if (!parentWin || parentWin === win) return;
      win.__parentWheelScroll = true;

      const onWheel = (e) => {
        // Forward wheel/trackpad scrolling to the parent page while the pointer is over the iframe.
        // This prevents the "stuck" feeling when the user scrolls on a slide iframe.
        const dy = e.deltaY || 0;
        const dx = e.deltaX || 0;
        if (!dx && !dy) return;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX > absY * 1.1) return;
        try {
          parentWin.scrollBy({ top: dy, left: 0, behavior: 'auto' });
        } catch (_) {
          try { parentWin.scrollBy(0, dy); } catch (_) {}
        }
        // Prevent the iframe from consuming the wheel event.
        e.preventDefault();
      };

      // Non-passive is required because we call preventDefault.
      doc.addEventListener('wheel', onWheel, { passive: false });
    } catch (_) {
      // ignore
    }
  }

  function enableParentTouchScroll(doc) {
    try {
      const win = doc && doc.defaultView;
      if (!win || win.__parentTouchScroll) return;
      const parentWin = win.parent;
      if (!parentWin || parentWin === win) return;
      const driver = getParentScrollDriver(doc);
      if (!driver) return;
      win.__parentTouchScroll = true;

      let active = false;
      let axis = null;
      let startX = 0;
      let startY = 0;
      let lastY = 0;
      let pid = null;
      const threshold = 8;

      const begin = (x, y, id) => {
        active = true;
        axis = null;
        pid = id != null ? id : null;
        startX = x;
        startY = y;
        lastY = y;
        driver.cancel();
      };

      const move = (x, y, id, ev) => {
        if (!active) return;
        if (pid != null && id != null && id !== pid) return;
        const dx = x - startX;
        const dy = y - startY;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);

        if (axis === null) {
          if (ax > ay + threshold) axis = 'x';
          else if (ay > ax + threshold) axis = 'y';
          else return;
        }
        if (axis !== 'y') return;

        const deltaY = y - lastY;
        lastY = y;
        if (!deltaY) return;
        try {
          const scrollDelta = -deltaY;
          driver.scrollBy(scrollDelta);
          driver.record(scrollDelta);
        } catch (_) {}
        ev.preventDefault();
      };

      const onEnd = () => {
        if (active && axis === 'y') driver.start();
        active = false;
        axis = null;
        pid = null;
      };

      if ('PointerEvent' in win) {
        const onPointerStart = (e) => {
          if (e.pointerType && e.pointerType !== 'touch') return;
          if (e.isPrimary === false) return;
          begin(e.clientX, e.clientY, e.pointerId);
        };
        const onPointerMove = (e) => {
          if (e.pointerType && e.pointerType !== 'touch') return;
          move(e.clientX, e.clientY, e.pointerId, e);
        };
        const onPointerEnd = (e) => {
          if (e.pointerType && e.pointerType !== 'touch') return;
          onEnd();
        };
        win.addEventListener('pointerdown', onPointerStart, { passive: true });
        win.addEventListener('pointermove', onPointerMove, { passive: false });
        win.addEventListener('pointerup', onPointerEnd, { passive: true });
        win.addEventListener('pointercancel', onPointerEnd, { passive: true });
        win.addEventListener('lostpointercapture', onPointerEnd, { passive: true });
      } else {
        const onStart = (e) => {
          if (!e.touches || e.touches.length !== 1) return;
          const t = e.touches[0];
          begin(t.clientX, t.clientY, t.identifier);
        };
        const onMove = (e) => {
          if (!active) return;
          const t = e.touches && e.touches[0];
          if (!t) return;
          move(t.clientX, t.clientY, t.identifier, e);
        };
        win.addEventListener('touchstart', onStart, { passive: true });
        win.addEventListener('touchmove', onMove, { passive: false });
        win.addEventListener('touchend', onEnd, { passive: true });
        win.addEventListener('touchcancel', onEnd, { passive: true });
      }
    } catch (_) {
      // ignore
    }
  }

  function computeDocHeight(doc) {
    const body = doc.body;
    const html = doc.documentElement;
    if (!body || !html) return 0;
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
      if (frame.__variant !== 'mobile') return 0;
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
      ensureNoInnerVerticalScroll(doc);
      enableTouchHorizontalScroll(doc);
      enableParentTouchScroll(doc);
      enableParentWheelScroll(doc);

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
    } catch (_) {
      // ignore
    }
  }

  function activeFrameFor(section) {
    return isDesktop() ? section.querySelector('.view-desktop') : section.querySelector('.view-mobile');
  }

  function inactiveFrameFor(section) {
    return isDesktop() ? section.querySelector('.view-mobile') : section.querySelector('.view-desktop');
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

  function updateParallax() {
    const applyZero = () => state.slides.forEach(({ section }) => section.style.setProperty('--frame-shift', '0px'));
    if (!motionAllowed()) return applyZero();

    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!vh) return applyZero();

    state.slides.forEach(({ section }) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height * 0.5;
      const normalized = (center - vh * 0.5) / Math.max(rect.height || 1, vh);
      const shift = Math.max(-18, Math.min(18, -normalized * 22));
      section.style.setProperty('--frame-shift', `${shift.toFixed(2)}px`);
    });
  }

  function scheduleParallax() {
    if (state.parallaxTicking) return;
    state.parallaxTicking = true;
    (window.requestAnimationFrame || setTimeout)(() => {
      state.parallaxTicking = false;
      updateParallax();
    });
  }

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
      try {
        const doc = a.contentDocument || a.contentWindow.document;
        if (doc && doc.readyState === 'complete') {
          scheduleSize(a);
        }
      } catch (_) {}
    }
  }

  function preloadActiveNear(anchor, before = 1, after = 3) {
    if (!anchor) return;
    const start = Math.max(0, anchor.index - before);
    const end = Math.min(state.slides.length - 1, anchor.index + after);
    for (let i = start; i <= end; i++) {
      const { section } = state.slides[i];
      const f = activeFrameFor(section);
      if (!f) continue;
      if (!isLoaded(f)) {
        try {
          f.loading = 'eager';
          if (!f.__kickLoaded) {
            f.__kickLoaded = true;
            // Trigger a fetch if browser hasn't started due to lazy state
            const src = f.getAttribute('src');
            if (src) f.setAttribute('src', src);
          }
        } catch (_) {}
      }
      // Make sure it's visible and has a seeded height until load completes
      f.style.visibility = 'visible';
      if (!f.__lastHeight) {
        const seed = Math.max(Math.min(1200, Math.max(window.innerHeight || 0, 320)), 320);
        f.style.height = toPx(seed);
      }
    }
  }

  function buildSlides() {
    SLIDES.forEach((s, index) => {
      const section = document.createElement('section');
      section.className = 'slide';
      section.dataset.slideId = s.id;
      section.dataset.slideIndex = String(index);
      section.style.setProperty('--frame-shift', '0px');
      section.style.setProperty('--reveal-delay', '0s');
      if (index === 0) {
        section.classList.add('is-visible');
      }

      const fDesktop = document.createElement('iframe');
      fDesktop.className = 'slide-frame view-desktop';
      fDesktop.setAttribute('title', `${s.id} (desktop)`);
      fDesktop.setAttribute('scrolling', 'no');
      // Eager-load the active variant so all slides are present sequentially
      fDesktop.loading = isDesktop() ? 'eager' : 'lazy';
      fDesktop.src = PARTIALS_BASE + s.desktop;
      fDesktop.style.height = '0px';
      fDesktop.style.overflow = 'hidden';
      fDesktop.style.visibility = 'hidden';
      fDesktop.__variant = 'desktop';

      const fMobile = document.createElement('iframe');
      fMobile.className = 'slide-frame view-mobile';
      fMobile.setAttribute('title', `${s.id} (mobile)`);
      fMobile.setAttribute('scrolling', 'no');
      // Eager-load the active variant so all slides are present sequentially
      fMobile.loading = isDesktop() ? 'lazy' : 'eager';
      fMobile.src = PARTIALS_BASE + s.mobile;
      fMobile.style.height = '0px';
      fMobile.style.overflow = 'hidden';
      fMobile.style.visibility = 'hidden';
      fMobile.__variant = 'mobile';

      section.appendChild(fDesktop);
      section.appendChild(fMobile);
      slidesRoot.appendChild(section);

      // Auto-size when content loads
      fDesktop.addEventListener('load', () => {
        prepareFrame(fDesktop);
        updateFootprintsDriver();
        maybeHideSlideSkeleton(fDesktop);
      });
      fMobile.addEventListener('load', () => {
        prepareFrame(fMobile);
        updateFootprintsDriver();
        maybeHideSlideSkeleton(fMobile);
      });

      // Reserve space for the first visible variant to prevent initial jump
      if (index === 0) {
        const initial = isDesktop() ? fDesktop : fMobile;
        initial.style.height = `${Math.max(window.innerHeight, 320)}px`;
        initial.style.visibility = 'visible';
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
  }

  function onResize() {
    sizeVisibleFrames();
    clearTimeout(window.__slidesReflow);
    window.__slidesReflow = setTimeout(sizeVisibleFrames, 200);
    scheduleParallax();
    updateFootprintsDriver();
  }

  function updateFootprintsDriver() {
    scheduleParallax();
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
    scheduleParallax();
    setScrollVelocity(0);

    function onViewportModeChange() {
      const anchor = getViewportAnchor();
      // Switch variants with seeded heights to keep layout stable
      state.slides.forEach(({ section }) => updateActiveVariant(section));
      // Preload active frames around viewport for smooth immediate display
      preloadActiveNear(anchor, 1, 4);
      sizeVisibleFrames();
      setupSlideReveals();
      scheduleParallax();
      // Restore the viewport anchor after heights settle
      setTimeout(() => { sizeVisibleFrames(); preloadActiveNear(anchor, 1, 4); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 60);
      setTimeout(() => { sizeVisibleFrames(); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 160);
      setTimeout(() => { sizeVisibleFrames(); restoreViewportAnchor(anchor); updateFootprintsDriver(); }, 320);
    }

    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onViewportModeChange);
    else if (mqDesktop.addListener) mqDesktop.addListener(onViewportModeChange);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateFootprintsDriver, { passive: true });
    window.addEventListener('scroll', trackScrollVelocity, { passive: true });
    document.addEventListener('scroll', updateFootprintsDriver, { passive: true, capture: true });

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

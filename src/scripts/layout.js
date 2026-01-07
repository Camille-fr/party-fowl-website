/*
  Layout manager (header/footer) for all pages.
  - Injects responsive header/footer partials (mobile/desktop variants)
  - Switches variants on viewport change
  - Executes inline scripts inside partials and mounts styles cleanly
*/
(function () {
  'use strict';

  const PARTIALS_BASE = '../partials/layout/';
  const VARIANTS = {
    header: { desktop: 'headerdesktop.html', mobile: 'headermobile.html' },
    footer: { desktop: 'footerdesktop.html', mobile: 'footermobile.html' }
  };
  const HEADER_CSS_VAR = '--pf-header-height';
  const HEADER_EVENT_NAME = 'pfHeaderHeightChange';
  let headerResizeObserver = null;
  let lastHeaderHeight = -1;

  const isHome = () => !!document.getElementById('slidesRoot');
  const mqDesktop = window.matchMedia(isHome() ? '(min-width: 1024px)' : '(min-width: 900px)');
  const isDesktop = () => mqDesktop.matches;

  let mounts = null;
  let cache = Object.create(null);

  function ensureMounts() {
    if (mounts) return mounts;
    const head = document.querySelector('[data-role="site-header"]') || (() => {
      const d = document.createElement('div');
      d.id = 'siteHeaderMount';
      d.dataset.role = 'site-header';
      document.body.insertBefore(d, document.body.firstChild);
      return d;
    })();
    const foot = document.querySelector('[data-role="site-footer"]') || (() => {
      const d = document.createElement('div');
      d.id = 'siteFooterMount';
      d.dataset.role = 'site-footer';
      document.body.appendChild(d);
      return d;
    })();
    mounts = { head, foot };
    return mounts;
  }

  function emitHeaderHeightEvent(value) {
    try {
      const evt = new CustomEvent(HEADER_EVENT_NAME, { detail: { height: value } });
      window.dispatchEvent(evt);
    } catch (_) {
      const evt = document.createEvent('Event');
      evt.initEvent(HEADER_EVENT_NAME, false, false);
      window.dispatchEvent(evt);
    }
  }

  function setHeaderHeightValue(height) {
    const safe = Math.max(0, Math.round(height || 0));
    if (safe === lastHeaderHeight) return;
    lastHeaderHeight = safe;
    try {
      document.documentElement.style.setProperty(HEADER_CSS_VAR, `${safe}px`);
    } catch (_) {}
    window.__pfHeaderHeight = safe;
    emitHeaderHeightEvent(safe);
  }

  function updateHeaderHeight() {
    try {
      const header = document.querySelector('.site-header');
      const rect = header ? header.getBoundingClientRect() : null;
      const height = rect ? rect.height : 0;
      setHeaderHeightValue(height);
    } catch (_) {
      setHeaderHeightValue(0);
    }
  }

  function watchHeaderResize() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    if (headerResizeObserver) {
      headerResizeObserver.disconnect();
      headerResizeObserver = null;
    }
    if (typeof ResizeObserver === 'function') {
      headerResizeObserver = new ResizeObserver(() => {
        updateHeaderHeight();
      });
      headerResizeObserver.observe(header);
    }
  }

  setHeaderHeightValue(0);

  function cleanupStyles(key) {
    const nodes = document.querySelectorAll(`style[data-layout-style="${key}"]`);
    nodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
  }

  function execScriptNode(node, scope) {
    const s = document.createElement('script');
    // Copy attributes if any
    Array.from(node.attributes || []).forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = node.textContent || '';
    // Append near scope (mount) to keep ordering reasonable
    (scope || document.body).appendChild(s);
  }

  async function fetchPartial(url) {
    try {
      if (cache[url]) return cache[url];
      const res = await fetch(url, { credentials: 'same-origin' });
      const txt = await res.text();
      cache[url] = txt || '';
      return cache[url];
    } catch (_) {
      return '';
    }
  }

  function parseAndMount(html, mount, key) {
    function getAssetsRoot() {
      try {
        const p = location.pathname || '';
        const i = p.indexOf('/src/');
        if (i >= 0) return p.slice(0, i + 5) + 'assets/'; // '/src/' + 'assets/'
        // Fallback: relative to page
        return '../assets/';
      } catch (_) {
        return '../assets/';
      }
    }

    function rewriteAttrUrl(val, assetsRoot) {
      if (!val) return val;
      // ignore absolute urls and data URIs
      if (/^([a-z]+:)?\/\//i.test(val) || /^data:/i.test(val)) return val;
      const idx = val.indexOf('assets/');
      if (idx >= 0) {
        const rest = val.slice(idx + 'assets/'.length);
        return assetsRoot + rest.replace(/^\/*/, '');
      }
      return val;
    }

    function rewriteCssUrls(cssText, assetsRoot) {
      try {
        return cssText.replace(/url\(([^)]+)\)/g, (m, g1) => {
          let raw = g1.trim().replace(/^['"]|['"]$/g, '');
          if (!raw || /^data:/i.test(raw) || /^([a-z]+:)?\/\//i.test(raw)) return m;
          const idx = raw.indexOf('assets/');
          if (idx >= 0) {
            const rest = raw.slice(idx + 'assets/'.length).replace(/^\/*/, '');
            const repl = assetsRoot + rest;
            return `url("${repl}")`;
          }
          return m;
        });
      } catch (_) {
        return cssText;
      }
    }

    // Clear previous content and styles
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    cleanupStyles(key);

    if (!html || !html.trim()) {
      mount.style.display = 'none';
      return;
    }
    mount.style.display = '';

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const frag = document.createDocumentFragment();
    const assetsRoot = getAssetsRoot();

    const styles = Array.from(tmp.querySelectorAll('style'));
    styles.forEach((st) => {
      const copy = document.createElement('style');
      copy.type = 'text/css';
      copy.setAttribute('data-layout-style', key);
      copy.textContent = rewriteCssUrls(st.textContent || '', assetsRoot);
      document.head.appendChild(copy);
      st.parentNode && st.parentNode.removeChild(st);
    });

    const scripts = Array.from(tmp.querySelectorAll('script'));
    scripts.forEach((sc) => sc.parentNode && sc.parentNode.removeChild(sc));

    // Rewrite asset urls in attributes
    Array.from(tmp.querySelectorAll('[src], [href]')).forEach((el) => {
      ['src', 'href'].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const v = el.getAttribute(attr) || '';
        const nv = rewriteAttrUrl(v, assetsRoot);
        if (nv !== v) el.setAttribute(attr, nv);
      });
    });

    Array.from(tmp.childNodes).forEach((n) => frag.appendChild(n));
    mount.appendChild(frag);

    // Re-exec scripts in order
    scripts.forEach((sc) => execScriptNode(sc, mount));
  }

  async function mountPartials() {
    ensureMounts();
    const variant = isDesktop() ? 'desktop' : 'mobile';
    const headerURL = PARTIALS_BASE + VARIANTS.header[variant];
    const footerURL = PARTIALS_BASE + VARIANTS.footer[variant];

    const [hHTML, fHTML] = await Promise.all([fetchPartial(headerURL), fetchPartial(footerURL)]);
    parseAndMount(hHTML, mounts.head, 'header');
    parseAndMount(fHTML, mounts.foot, 'footer');

    watchHeaderResize();
    updateHeaderHeight();

    mounts.head.dataset.variant = variant;
    mounts.foot.dataset.variant = variant;
  }

  async function remountIfNeeded() {
    if (!mounts) return mountPartials();
    const current = mounts.head && mounts.head.dataset.variant || '';
    const next = isDesktop() ? 'desktop' : 'mobile';
    if (current !== next) {
      // Preserve viewport anchor while switching header variant if heights differ
      const yBefore = window.scrollY || window.pageYOffset || 0;
      await mountPartials();
      // If header height changed significantly, adjust scroll to compensate
      try {
        const headerEl = mounts.head.querySelector('.site-header');
        const h = headerEl ? headerEl.getBoundingClientRect().height : 0;
        // Optionally adjust scroll by small delta if needed (kept minimal here)
        if (h && Math.abs((window.scrollY || 0) - yBefore) > 2) {
          window.scrollTo(0, yBefore);
        }
      } catch (_) {}
    }
  }

  function initContactEnhancements() {
    if (!document.getElementById('slidesRoot')) return;

    const MAX_TRIES = 30;
    const TRY_DELAY_MS = 150;

    const decorateContactSlide = () => {
      const slide = document.querySelector('.slide[data-slide-id="home-08-contact"]');
      if (!slide) return null;
      if (!slide.id) slide.id = 'contact';
      slide.classList.add('pf-contact');
      return slide;
    };

    const setStatus = (statusEl, msg, kind) => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.classList.remove('is-success', 'is-error');
      if (kind === 'success') statusEl.classList.add('is-success');
      if (kind === 'error') statusEl.classList.add('is-error');
      statusEl.hidden = !(msg && msg.trim());
    };

    const bindContactForm = (frame) => {
      try {
        const doc = frame && (frame.contentDocument || frame.contentWindow?.document);
        if (!doc) return;
        const section = doc.querySelector('#contact.pf-contact') || doc.querySelector('.pf-contact');
        if (!section) return;
        const form = section.querySelector('form');
        if (!form || form.dataset.pfBound === 'true') return;

        const statusEl = form.querySelector('[data-role="pf-contact-validation"]');
        form.dataset.pfBound = 'true';

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const valid = typeof form.checkValidity === 'function' ? form.checkValidity() : true;
          if (!valid) {
            setStatus(statusEl, 'Please complete the required fields.', 'error');
            try { if (typeof form.reportValidity === 'function') form.reportValidity(); } catch (_) {}
            return;
          }
          setStatus(statusEl, 'Thanks! We’ll be in touch soon.', 'success');
        });

        form.addEventListener('input', () => {
          if (!statusEl || statusEl.hidden) return;
          setStatus(statusEl, '', '');
        });
      } catch (_) {
        // ignore cross-document access issues
      }
    };

    const attachListeners = () => {
      const slide = decorateContactSlide();
      if (!slide) return false;

      const frames = Array.from(slide.querySelectorAll('iframe.slide-frame'));
      if (!frames.length) return true;

      frames.forEach((frame) => {
        if (frame.dataset.pfContactFrameBound === 'true') return;
        frame.dataset.pfContactFrameBound = 'true';

        frame.addEventListener('load', () => bindContactForm(frame));
        bindContactForm(frame);
      });

      return true;
    };

    let tries = 0;
    const tick = () => {
      tries += 1;
      if (attachListeners() || tries >= MAX_TRIES) return;
      window.setTimeout(tick, TRY_DELAY_MS);
    };

    tick();
  }

  function init() {
    mountPartials();
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', remountIfNeeded);
    else if (mqDesktop.addListener) mqDesktop.addListener(remountIfNeeded);
    window.addEventListener('resize', remountIfNeeded);
    window.addEventListener('resize', updateHeaderHeight, { passive: true });
    initContactEnhancements();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

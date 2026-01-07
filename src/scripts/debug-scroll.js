/*
  Regression test reminder for the mobile carousel sections:
  1. On both the social media reels (home-02) and the menu carousel (home-03), start a vertical swipe from the top of the carousel to make sure the page keeps scrolling.
  2. While still on the carousel, swipe horizontally so the carousel moves and verify the page does not lock.
  3. Repeat those swipes after tapping any category, indicator, or jump button to ensure the new state does not block scroll.
  4. Repeat again after playing and pausing a reel so the video controls are not keeping the viewport stuck.
  Toggle `window.__DEBUG_SCROLL__ = true` in the console before running these flows to surface stack traces.
*/
(function () {
  const doc = typeof window !== 'undefined' && window.document;
  if (!doc) return;

  const pointerCaptureMap = new Map();
  const scrollTargets = [doc.documentElement, doc.body].filter(Boolean);
  if (!scrollTargets.length) return;

  const isDebugLogging = () => !!window.__DEBUG_SCROLL__;

  function log(label, payload) {
    if (!isDebugLogging()) return;
    const stack = new Error().stack;
    console.warn(`[DEBUG_SCROLL] ${label}`, payload, stack);
  }

  const { preventDefault: origPreventDefault } = Event.prototype;
  Event.prototype.preventDefault = function (...args) {
    if (isDebugLogging() && this && this.type === 'touchmove') {
      log('preventDefault on touchmove', { type: this.type, target: this.target });
    }
    return origPreventDefault.apply(this, args);
  };

  const origSetPointerCapture = Element.prototype.setPointerCapture;
  if (typeof origSetPointerCapture === 'function') {
    Element.prototype.setPointerCapture = function (pointerId) {
      try {
        pointerCaptureMap.set(pointerId, this);
        log('pointer capture set', { element: this, pointerId });
      } catch (_) {}
      return origSetPointerCapture.call(this, pointerId);
    };
  }

  const origReleasePointerCapture = Element.prototype.releasePointerCapture;
  if (typeof origReleasePointerCapture === 'function') {
    Element.prototype.releasePointerCapture = function (pointerId) {
      pointerCaptureMap.delete(pointerId);
      return origReleasePointerCapture.call(this, pointerId);
    };
  }

  const overflowState = new WeakMap();

  function getComputedOverflow(el) {
    const style = window.getComputedStyle(el);
    if (!style) return null;
    return {
      overflow: style.overflow,
      overflowX: style.overflowX,
      overflowY: style.overflowY
    };
  }

  function hasHiddenOverflow(el) {
    const computed = getComputedOverflow(el);
    if (!computed) return false;
    return ['hidden'].some((value) =>
      computed.overflow === value ||
      computed.overflowX === value ||
      computed.overflowY === value
    );
  }

  function checkOverflow(el) {
    if (!el) return;
    const hidden = hasHiddenOverflow(el);
    const prev = overflowState.get(el) || false;
    if (hidden && !prev) {
      overflowState.set(el, true);
      log('overflow hidden', {
        element: el,
        computed: getComputedOverflow(el)
      });
    } else if (!hidden && prev) {
      overflowState.set(el, false);
    }
  }

  if (typeof MutationObserver === 'function') {
    const overflowObserver = new MutationObserver(() => {
      scrollTargets.forEach(checkOverflow);
    });
    scrollTargets.forEach((element) => {
      overflowObserver.observe(element, { attributes: true, attributeFilter: ['style', 'class'] });
      checkOverflow(element);
    });
  } else {
    scrollTargets.forEach(checkOverflow);
  }
})();

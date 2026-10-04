(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touchPointer = matchMedia('(pointer: coarse)');
  let controller = null, paused = false, pageActive = true;
  const motion = () => !reduced.matches && !root.classList.contains('motion-off');
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  function cancelMomentum() {
    if (controller && !controller.isStopped) {
      // Stop at the current position without toggling root overflow or scrollbar width.
      controller.reset();
    }
  }

  function sync() {
    // Touch scrolling already has native momentum. Keeping a wheel controller
    // alive on phones also adds resize/RAF work while Safari moves its bars.
    if (!pageActive || !motion() || touchPointer.matches || innerWidth <= 760 || !window.Lenis) {
      controller?.destroy(); controller = null; paused = false;
      return;
    }
    if (!controller) {
      controller = new window.Lenis({
        autoRaf:true, smoothWheel:true, syncTouch:false,
        wheelMultiplier:1, lerp:.16, anchors:false,
        respectReducedMotion:true, allowNestedScroll:false,
        prevent:node => node.matches('dialog, [data-lenis-prevent]'),
        virtualScroll:input => {
          const {event} = input;
          if (event.defaultPrevented || event.target.closest('dialog, [data-lenis-prevent]')) {
            cancelMomentum(); return false;
          }
          if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(input.deltaX) > Math.abs(input.deltaY)) {
            cancelMomentum(); return false;
          }
          if (event.type !== 'wheel' || !controller || controller.isStopped) return;
          const direction = Math.sign(input.deltaY);
          if (!direction) return;
          const field = event.target.closest('textarea, select');
          const hasInnerScroll = field && (field.tagName === 'TEXTAREA' || field.multiple || field.size > 1);
          const fieldLimit = hasInnerScroll ? field.scrollHeight - field.clientHeight : 0;
          if (fieldLimit > 1 && (direction < 0 ? field.scrollTop > 1 : field.scrollTop < fieldLimit - 1)) {
            // Only the field's own content scrolls natively. At either edge,
            // keep page wheel input in Lenis so its speed never changes.
            cancelMomentum(); return false;
          }
          const lead = controller.targetScroll - controller.actualScroll;
          // A reversal cancels the old fling instead of continuing toward its old target.
          if (Math.abs(lead) > 1 && Math.sign(lead) !== direction) cancelMomentum();
          const remaining = Math.max(0, Math.min(1200, innerHeight * 1.5)
            - Math.max(0, (controller.targetScroll - controller.actualScroll) * direction));
          if (!remaining) { event.preventDefault(); return false; }
          // Bound queued travel as well as single bursts; fast wheels stay controllable.
          input.deltaY = direction * Math.min(Math.abs(input.deltaY), 480, remaining);
          input.deltaX = clamp(input.deltaX, 480);
        }
      });
    }
    const shouldPause = root.classList.contains('experience-opened') || document.hidden;
    if (shouldPause !== paused) {
      paused = shouldPause;
      if (paused) controller.stop(); else controller.start();
    }
  }

  function to(target, options = {}) {
    sync();
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element == null) return;
    const {offset = 0, ...scrollOptions} = options;
    const top = (typeof element === 'number' ? element : element.getBoundingClientRect().top + scrollY) + offset;
    if (controller && !controller.isStopped) {
      controller.resize();
      controller.scrollTo(top, {
        lerp:0, duration:.8, easing:t => 1 - Math.pow(1 - t, 3), ...scrollOptions
      });
    } else {
      window.scrollTo({top, behavior:options.immediate||!motion()?'instant':'smooth'});
      options.onComplete?.();
    }
  }
  window.TT_SCROLL = {
    to,
    get state() {
      return {enabled:!!controller, paused, current:scrollY,
        target:controller?.targetScroll ?? scrollY, velocity:controller?.velocity ?? 0};
    }
  };

  // Native keyboard/scrollbar navigation and control clicks interrupt queued wheel motion.
  document.addEventListener('pointerdown', cancelMomentum, {capture:true, passive:true});
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) cancelMomentum();
  }, true);
  document.addEventListener('click', event => {
    if (!controller || event.defaultPrevented || event.button !== 0
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname
      || url.search !== location.search) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    const keyboard = event.detail === 0;
    to(target, {
      offset:target.id === 'home' ? 0 : -(parseFloat(getComputedStyle(root).scrollPaddingTop) || 105),
      onComplete:() => {
        if (!keyboard) return;
        const hadTabindex = target.hasAttribute('tabindex');
        if (!hadTabindex) target.tabIndex = -1;
        target.focus({preventScroll:true});
        if (!hadTabindex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), {once:true});
      }
    });
  });
  let previousFlags = `${root.classList.contains('motion-off')}:${root.classList.contains('experience-opened')}`;
  new MutationObserver(() => {
    const flags = `${root.classList.contains('motion-off')}:${root.classList.contains('experience-opened')}`;
    if (flags === previousFlags) return;
    previousFlags = flags;
    sync();
  }).observe(root, {attributes:true, attributeFilter:['class']});
  reduced.addEventListener('change', sync);
  touchPointer.addEventListener('change', sync);
  let previousWidth = innerWidth;
  window.addEventListener('resize', () => {
    if (innerWidth === previousWidth) return;
    previousWidth = innerWidth;
    sync();
  }, {passive:true});
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; controller?.destroy(); controller = null; paused = false; });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  window.addEventListener('popstate', cancelMomentum);
  sync();
})();

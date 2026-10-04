(() => {
  'use strict';
  const widget = document.querySelector('.photo-widget');
  if (!widget) return;
  const viewport = widget.querySelector('.photo-window');
  const heroPanel = widget.closest('.hero-brief');
  const slides = [...widget.querySelectorAll('.photo-slide')];
  if (!viewport || !slides.length) return;
  const pause = widget.querySelector('.photo-pause');
  const dots = [...widget.querySelectorAll('.photo-pagination .photo-dot')];
  const mobileViewer = matchMedia('(max-width: 760px)');
  const previous = widget.querySelector('.photo-previous');
  const next = widget.querySelector('.photo-next');
  const count = widget.querySelector('.photo-browse-count');
  const announcement = widget.querySelector('.photo-announcement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const interval = 5800;
  const t = key => window.TT_LOCALES?.[document.documentElement.lang]?.[key]
    ?? window.TT_LOCALES?.ru?.[key] ?? key;
  let active = 0, timer = 0, userPaused = false, visible = false, windowFocused = true;
  let pointerVisible = false, lastPointer = null;
  let animations = [], gesture = null, request = 0, suppressUntil = 0;
  let cursorFrame = 0, cursorTime = 0;
  const cursor = {x:0,y:0,light:0,tx:0,ty:0,tl:0};
  const photoLight = {opacity:0,target:0};
  const styleValues = new Map();
  let shinePoint = null;
  function setViewportStyle(name,value) {
    if (styleValues.get(name) === value) return;
    viewport.style.setProperty(name,value);
    styleValues.set(name,value);
  }
  const motionOff = () => reduced.matches || document.documentElement.classList.contains('motion-off');
  let lastMotionOff = motionOff();
  const modalOpen = () => document.documentElement.classList.contains('experience-opened');
  let lastModalOpen = modalOpen();
  const keyboardFocus = () => widget.contains(document.activeElement)
    && document.activeElement.matches(':focus-visible');
  const mayPlay = () => !mobileViewer.matches && visible && windowFocused && !document.hidden && !userPaused
    && !gesture && !keyboardFocus() && !motionOff() && !modalOpen();

  function lightPoint(pointer) {
    const style = getComputedStyle(viewport);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const paddingX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const paddingY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const width = (parseFloat(style.width) || viewport.offsetWidth)
      + (style.boxSizing === 'border-box' ? 0 : borderLeft + borderRight + paddingX);
    const height = (parseFloat(style.height) || viewport.offsetHeight)
      + (style.boxSizing === 'border-box' ? 0 : borderTop + borderBottom + paddingY);
    if (!width || !height) return null;
    const bounds = viewport.getBoundingClientRect();
    const [originX,originY] = style.transformOrigin.split(' ').map(parseFloat);
    const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    // Recover the screen origin from the four projected corners. This includes the
    // panel's scroll/reveal translation without mixing it into the card's own matrix.
    const corners = [[0,0],[width,0],[width,height],[0,height]].map(([x,y]) => {
      const point = matrix.transformPoint({x:x - originX,y:y - originY,z:0,w:1});
      return {x:point.x / point.w,y:point.y / point.w};
    });
    const screenX = pointer.clientX - bounds.left + Math.min(...corners.map(point => point.x));
    const screenY = pointer.clientY - bounds.top + Math.min(...corners.map(point => point.y));
    // Invert the projected z=0 photo plane, rather than an axis-aligned bounding box.
    // A plain matrix inverse with screen z=0 would miss the tilt/perspective plane.
    const a = matrix.m11 - screenX * matrix.m14;
    const b = matrix.m21 - screenX * matrix.m24;
    const c = matrix.m12 - screenY * matrix.m14;
    const d = matrix.m22 - screenY * matrix.m24;
    const e = screenX * matrix.m44 - matrix.m41;
    const f = screenY * matrix.m44 - matrix.m42;
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < 1e-8) return null;
    const x = (e * d - b * f) / determinant + originX - borderLeft;
    const y = (a * f - e * c) / determinant + originY - borderTop;
    return {x,y,inside:x >= 0 && y >= 0 && x <= width - borderLeft - borderRight
      && y <= height - borderTop - borderBottom};
  }

  function measureLight() {
    photoLight.target = 0;
    if (lastPointer && pointerVisible && finePointer.matches && !motionOff()
      && windowFocused && !document.hidden && !gesture && !modalOpen()) {
      const point = lightPoint(lastPointer);
      if (point) {
        shinePoint = point;
        photoLight.target = Number(point.inside);
      }
    }
  }

  function paintCursor() {
    setViewportStyle('--photo-follow-x', `${(cursor.x * 16).toFixed(3)}px`);
    setViewportStyle('--photo-follow-y', `${(cursor.y * 12).toFixed(3)}px`);
    setViewportStyle('--tilt-x', `${(-cursor.y * 6).toFixed(3)}deg`);
    setViewportStyle('--tilt-y', `${(cursor.x * 7).toFixed(3)}deg`);
    setViewportStyle('--photo-pan-x', `${(-cursor.x * 10).toFixed(3)}px`);
    setViewportStyle('--photo-pan-y', `${(-cursor.y * 10).toFixed(3)}px`);
    setViewportStyle('--cursor-light', cursor.light.toFixed(4));
    if (shinePoint) {
      setViewportStyle('--shine-x', `${shinePoint.x.toFixed(3)}px`);
      setViewportStyle('--shine-y', `${shinePoint.y.toFixed(3)}px`);
    }
    setViewportStyle('--photo-light', photoLight.opacity.toFixed(4));
  }
  function animateCursor(time) {
    cursorFrame = 0;
    const dt = Math.min(40, cursorTime ? time - cursorTime : 16);
    cursorTime = time;
    const ease = 1 - Math.exp(-dt / 85);
    // Measure the displayed pose before writing the next one. Keeping reads and
    // writes separate avoids a forced layout for every pointer animation frame.
    measureLight();
    cursor.x += (cursor.tx - cursor.x) * ease;
    cursor.y += (cursor.ty - cursor.y) * ease;
    cursor.light += (cursor.tl - cursor.light) * ease;
    photoLight.opacity += (photoLight.target - photoLight.opacity) * ease;
    const moving = Math.abs(cursor.tx - cursor.x) + Math.abs(cursor.ty - cursor.y)
      + Math.abs(cursor.tl - cursor.light) + Math.abs(photoLight.target - photoLight.opacity) > .002;
    if (!moving) {
      cursor.x = cursor.tx;cursor.y = cursor.ty;cursor.light = cursor.tl;
      photoLight.opacity = photoLight.target;
    }
    paintCursor();
    if (moving) cursorFrame = requestAnimationFrame(animateCursor);
    else cursorTime = 0;
  }
  function scheduleCursor() {
    if (!cursorFrame && !document.hidden) cursorFrame = requestAnimationFrame(animateCursor);
  }
  function resetCursor(immediate = false) {
    cursor.tx = cursor.ty = cursor.tl = 0;
    photoLight.target = 0;
    if (immediate) {
      cancelAnimationFrame(cursorFrame);cursorFrame = cursorTime = 0;
      cursor.x = cursor.y = cursor.light = 0;photoLight.opacity = 0;paintCursor();
    } else scheduleCursor();
  }
  function followCursor(event) {
    if (event.pointerType === 'mouse') lastPointer = {
      pointerType:'mouse',clientX:event.clientX,clientY:event.clientY
    };
    if (event.pointerType !== 'mouse' || !finePointer.matches || motionOff()
      || !pointerVisible || !windowFocused || document.hidden || gesture || modalOpen()) return;
    // Follow the pointer across the visible hero screen, including its text column.
    // Use the untransformed panel so the moving photograph cannot feed back into its coordinates.
    const bounds = heroPanel?.getBoundingClientRect();
    const top = Math.max(0, bounds?.top ?? 0);
    const bottom = Math.min(innerHeight, bounds?.bottom ?? innerHeight);
    if (bottom <= top) {resetCursor();return;}
    cursor.tx = Math.max(-1,Math.min(1,event.clientX / document.documentElement.clientWidth * 2 - 1));
    cursor.ty = Math.max(-1,Math.min(1,(event.clientY - top) / Math.max(1,bottom - top) * 2 - 1));
    cursor.tl = 1;scheduleCursor();
  }

  function stopClock() {
    clearTimeout(timer);timer = 0;
    widget.dataset.playing = 'false';
  }
  function syncClock() {
    stopClock();
    if (!mayPlay()) return;
    widget.dataset.playing = 'true';
    timer = setTimeout(() => {timer = 0;if (mayPlay()) show(active + 1, 1, false);else syncClock();}, interval);
  }
  function cleanSlides() {
    animations.forEach(animation => animation.cancel());animations = [];
    slides.forEach((slide,index) => {
      slide.hidden = index !== active;
      slide.inert = index !== active;
      slide.setAttribute('aria-hidden', String(index !== active));
      slide.style.transform = '';
    });
  }
  function releaseGesture() {
    const previous = gesture;
    gesture = null;
    viewport.classList.remove('is-dragging');
    if (previous && viewport.hasPointerCapture(previous.id)) viewport.releasePointerCapture(previous.id);
    return previous;
  }
  function cancelInteraction() {
    // An unfinished decode or pointer press must not survive leaving the page.
    ++request;
    releaseGesture();
    cleanSlides();
  }
  function previewGesture() {
    const direction = gesture.dx < 0 ? 1 : -1;
    const adjacent = (active + direction + slides.length) % slides.length;
    slides.forEach((slide,index) => {
      const current = index === active;
      slide.hidden = !current && index !== adjacent;
      slide.inert = !current;
      slide.setAttribute('aria-hidden', String(!current));
      slide.style.transform = current ? `translateX(${gesture.dx}px)`
        : index === adjacent ? `translateX(${direction * viewport.clientWidth + gesture.dx}px)` : '';
    });
  }
  function syncLabels() {
    widget.setAttribute('aria-roledescription', t('widget.carousel'));
    if (pause) {
      const label = t(motionOff() ? 'widget.still' : userPaused ? 'widget.play' : 'widget.pause');
      pause.disabled = motionOff();
      pause.setAttribute('aria-pressed', String(userPaused || motionOff()));
      pause.setAttribute('aria-label', label);
      pause.setAttribute('title', label);
    }
    previous?.setAttribute('aria-label', t('widget.previous'));
    next?.setAttribute('aria-label', t('widget.next'));
    if (count) count.textContent = `${String(active + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    dots.forEach((dot, index) => {
      dot.setAttribute('aria-pressed', String(index === active));
      dot.setAttribute('aria-label', `${t('filter.' + slides[index].dataset.shortcut)}, ${index + 1} / ${slides.length}`);
    });
    widget.querySelector('.photo-pagination')?.setAttribute('aria-label', t('widget.carousel'));
    widget.dataset.active = String(active);
  }
  async function show(index, direction = 1, manual = true, startX = 0) {
    const next = (index + slides.length) % slides.length;
    const ticket = ++request;
    if (gesture) {releaseGesture();cleanSlides();}
    if (next === active) {cleanSlides();syncClock();return;}
    stopClock();
    const image = slides[next].querySelector('img');
    if (!image.complete || !image.naturalWidth) {
      cleanSlides();startX = 0;
      try {await image.decode();} catch {if (ticket === request) {cleanSlides();syncClock();}return;}
      if (ticket !== request) return;
    }
    if (!manual && !mayPlay()) {cleanSlides();syncClock();return;}
    const previous = active, hadFocus = slides[previous].contains(document.activeElement);
    cleanSlides();active = next;
    slides[next].hidden = false;slides[next].inert = false;slides[next].setAttribute('aria-hidden','false');
    slides[previous].inert = true;slides[previous].setAttribute('aria-hidden','true');
    syncLabels();
    if (manual && announcement) announcement.textContent = `${slides[next].querySelector('strong').textContent}, ${active + 1} / ${slides.length}`;
    if (!motionOff()) {
      const options = {duration:520,easing:'cubic-bezier(.22,.75,.2,1)',fill:'forwards'};
      animations = [
        slides[previous].animate([{transform:`translateX(${startX}px)`},{transform:`translateX(${-direction * 100}%)`}], options),
        slides[next].animate([{transform: startX ? `translateX(${direction * viewport.clientWidth + startX}px)`
          : `translateX(${direction * 100}%)`},{transform:'translateX(0)'}], options)
      ];
      animations[1].finished.then(() => {if (ticket === request) cleanSlides();}).catch(() => {});
    } else cleanSlides();
    if (hadFocus && manual) slides[next].focus({preventScroll:true});
    syncClock();
  }

  pause?.addEventListener('click', () => {cancelInteraction();userPaused = !userPaused;syncLabels();syncClock();});
  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index, index >= active ? 1 : -1)));
  mobileViewer.addEventListener('change', syncClock);
  previous?.addEventListener('click', () => show(active - 1, -1));
  next?.addEventListener('click', () => show(active + 1, 1));
  widget.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing
      || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();show(active + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1);
  });
  document.addEventListener('pointermove', followCursor, {passive:true});
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) {lastPointer = null;resetCursor();}
  });
  addEventListener('blur', () => {
    windowFocused = false;lastPointer = null;cancelInteraction();resetCursor(true);syncClock();
  });
  addEventListener('focus', () => {windowFocused = true;syncClock();});
  addEventListener('scroll', () => {if (pointerVisible && lastPointer && !modalOpen()) followCursor(lastPointer);}, {passive:true});
  widget.addEventListener('focusin', syncClock);
  widget.addEventListener('focusout', () => queueMicrotask(syncClock));

  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.target.closest('.photo-pause,.photo-nav,.photo-pagination')) return;
    cancelInteraction();
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,active:false};
    resetCursor();
    syncClock();
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.active && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gesture.active = true;viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');
    }
    if (!gesture.active) return;
    event.preventDefault();
    gesture.dx = Math.max(-viewport.clientWidth * .6,Math.min(viewport.clientWidth * .6,dx));
    previewGesture();
  });
  function endGesture(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    // Touch starts with implicit capture on the slide/link. Taking capture on
    // the viewport bubbles a lostpointercapture event from that child; it must
    // not cancel the swipe that has just begun.
    if (event.type === 'lostpointercapture' && event.target !== viewport) return;
    const previous = releaseGesture();
    if (previous.active) suppressUntil = performance.now() + 400;
    if (event.type === 'pointerup' && previous.active && Math.abs(previous.dx) > 45) {
      const direction = previous.dx < 0 ? 1 : -1;
      show(active + direction, direction, true, previous.dx);
    } else {cleanSlides();syncClock();}
    if (event.type === 'pointerup') followCursor(event);
  }
  viewport.addEventListener('pointerup', endGesture);
  viewport.addEventListener('pointercancel', endGesture);
  viewport.addEventListener('lostpointercapture', endGesture);
  viewport.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && gesture && !gesture.active) endGesture(event);
  });
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('click', event => {
    if (event.target.closest('.photo-pause,.photo-nav,.photo-pagination')) return;
    if (event.detail && performance.now() < suppressUntil) {event.preventDefault();event.stopImmediatePropagation();}
  }, true);

  new IntersectionObserver(entries => {
    visible = entries[0].intersectionRatio >= .45;
    pointerVisible = entries[0].intersectionRatio >= .15;
    if (!pointerVisible) {cancelInteraction();resetCursor(true);}
    else if (lastPointer) followCursor(lastPointer);
    syncClock();
  }, {threshold:[0,.15,.45]}).observe(widget);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {lastPointer = null;cancelInteraction();resetCursor(true);}
    syncClock();
  });
  document.addEventListener('tenerife:language', () => {
    syncLabels();syncClock();if (lastPointer) followCursor(lastPointer);
  });
  function motionChanged() {
    const nextMotionOff = motionOff();
    if (nextMotionOff === lastMotionOff) return;
    lastMotionOff = nextMotionOff;
    cancelInteraction();resetCursor(true);syncLabels();syncClock();
  }
  reduced.addEventListener('change', motionChanged);
  finePointer.addEventListener('change', () => resetCursor(true));
  new MutationObserver(() => {
    motionChanged();
    const nextModalOpen = modalOpen();
    if (nextModalOpen !== lastModalOpen) {
      lastModalOpen = nextModalOpen;
      // Preserve the visible opener while a collection/detail panel is on top.
      // Otherwise autoplay can make the focus-return target inert underneath it.
      if (nextModalOpen) {cancelInteraction();resetCursor(true);}
      syncClock();
    }
  }).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  function fitBackground() {
    document.querySelector('.brief-strip')?.style.setProperty('--strip-viewport',`${document.documentElement.clientWidth}px`);
    if (lastPointer) followCursor(lastPointer);
  }
  addEventListener('resize', fitBackground, {passive:true});
  new ResizeObserver(() => {if (lastPointer) followCursor(lastPointer);}).observe(viewport);
  // Prime all three local photos so a manual change never displays a lazy placeholder.
  slides.forEach(slide => {slide.querySelector('img').loading = 'eager';});
  cleanSlides();syncLabels();fitBackground();
})();

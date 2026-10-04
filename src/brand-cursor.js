(() => {
  'use strict';
  const title = document.querySelector('#hero-title');
  if (!title) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const glyphs = [...title.querySelectorAll('.brand-glyph')].map((element, index) => ({
    element, word: element.closest('.brand-word'), index, x: 0, y: 0, rotation: 0, written: ''
  }));
  let pointer = null, frame = 0, previousTime = 0;
  let hasGlyphMotion = false, cursorActive = false, cursorMoving = false;
  const enabled = () => document.documentElement.clientWidth > 760 && fine.matches && !reduced.matches && !root.classList.contains('motion-off');
  const visible = () => !document.hidden && !document.body.classList.contains('brand-title-away');
  const mix = (a, b, t) => a + (b - a) * t;

  function setCursorState(active, moving = active) {
    if (cursorActive !== active) {
      root.classList.toggle('brand-cursor-active', active);
      cursorActive = active;
    }
    if (cursorMoving !== moving) {
      title.classList.toggle('brand-cursor-moving', moving);
      cursorMoving = moving;
    }
  }
  function writeGlyph(glyph) {
    const x = `${glyph.x.toFixed(3)}px`;
    const y = `${glyph.y.toFixed(3)}px`;
    const rotation = `${glyph.rotation.toFixed(3)}deg`;
    const written = `${x}|${y}|${rotation}`;
    if (glyph.written === written) return;
    glyph.written = written;
    glyph.element.style.setProperty('--glyph-x', x);
    glyph.element.style.setProperty('--glyph-y', y);
    glyph.element.style.setProperty('--glyph-rotation', rotation);
  }

  function render(time) {
    frame = 0;
    const animate = enabled() && visible();
    if (!animate) {
      setCursorState(false);
      if (hasGlyphMotion) glyphs.forEach(glyph => {
        glyph.x = glyph.y = glyph.rotation = 0;
        writeGlyph(glyph);
      });
      hasGlyphMotion = false;
      previousTime = 0;
      return;
    }
    if (!pointer && !hasGlyphMotion) { setCursorState(false); return; }
    const bounds = title.getBoundingClientRect();
    const nearby = animate && pointer && pointer.x >= bounds.left && pointer.x <= bounds.right &&
      pointer.y >= bounds.top && pointer.y <= bounds.bottom;
    setCursorState(Boolean(nearby));
    if (!nearby && !hasGlyphMotion) { previousTime = 0; return; }
    const step = 1 - Math.pow(.81, Math.min(3, (time - (previousTime || time - 16.67)) / 16.67));
    previousTime = time;
    let settling = false;
    const scales = new Map();
    const rectangles = new Map();
    // Read every glyph before changing any of them so one pointer frame does
    // not alternate geometry reads with transform writes for each letter.
    if (nearby) glyphs.forEach(glyph => {
      if (!scales.has(glyph.word)) {
        scales.set(glyph.word, parseFloat(getComputedStyle(glyph.word).getPropertyValue('--brand-width')) || 1);
      }
      rectangles.set(glyph.element, glyph.element.getBoundingClientRect());
    });
    hasGlyphMotion = false;
    glyphs.forEach(glyph => {
      const scale = scales.get(glyph.word) || 1;
      let x = 0, y = 0, rotation = 0;
      if (nearby) {
        // Remove our own translation from the measured center so the force never chases itself.
        const rect = rectangles.get(glyph.element);
        const dx = rect.left + rect.width / 2 - glyph.x * scale - pointer.x;
        const dy = rect.top + rect.height / 2 - glyph.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const radius = Math.min(180, Math.max(130, bounds.height * .31));
        if (distance < radius) {
          const proximity = 1 - distance / radius;
          const force = proximity * proximity * (3 - 2 * proximity);
          const unitX = distance > .5 ? dx / distance : glyph.index % 2 ? 1 : -1;
          const unitY = distance > .5 ? dy / distance : -.45;
          x = unitX * force * 18 / scale;
          y = unitY * force * 14;
          rotation = unitX * force * 1.7;
        }
      }
      glyph.x = animate ? mix(glyph.x, x, step) : 0;
      glyph.y = animate ? mix(glyph.y, y, step) : 0;
      glyph.rotation = animate ? mix(glyph.rotation, rotation, step) : 0;
      if (Math.abs(glyph.x - x) + Math.abs(glyph.y - y) + Math.abs(glyph.rotation - rotation) > .02) settling = true;
      else { glyph.x = x; glyph.y = y; glyph.rotation = rotation; }
      if (glyph.x !== 0 || glyph.y !== 0 || glyph.rotation !== 0) hasGlyphMotion = true;
      writeGlyph(glyph);
    });
    // The title itself levitates; keep the force aligned with it only while the pointer is nearby.
    if (animate && (nearby || settling)) schedule();
    else { previousTime = 0; setCursorState(Boolean(nearby), false); }
  }
  function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(render); }
  function release() { pointer = null; schedule(); }
  document.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    pointer = {x: event.clientX, y: event.clientY};
    if (visible()) schedule();
  }, {passive: true});
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) release(); }, {passive: true});
  window.addEventListener('blur', release);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  reduced.addEventListener('change', release);
  fine.addEventListener('change', release);
  let motionClass = root.classList.contains('motion-off');
  new MutationObserver(() => {
    const nextMotion = root.classList.contains('motion-off');
    if (nextMotion !== motionClass) { motionClass = nextMotion; schedule(); }
  }).observe(root, {attributes: true, attributeFilter: ['class']});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0; previousTime = 0; pointer = null;
      setCursorState(false);
    } else schedule();
  });
  schedule();
})();

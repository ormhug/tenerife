(() => {
  'use strict';
  const panel = document.querySelector('.hero-brief');
  const title = panel?.querySelector('.brief-title');
  const lines = [...(title?.querySelectorAll('.brief-title-line') ?? [])];
  if (!panel || !title || !lines.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - value, 3);
  let frame = 0, settled = false, settledAfter = Infinity;
  const textLines = lines.map(line => ({line, text: line.firstElementChild, written: ''}));

  function render() {
    frame = 0;
    if (document.hidden) return;
    const mobile = document.documentElement.clientWidth <= 760;
    const still = mobile || reduced.matches || root.classList.contains('motion-off')
      || panel.contains(document.activeElement);
    if (settled && scrollY >= settledAfter) return;
    const viewportHeight = Math.max(1, innerHeight);
    const distance = viewportHeight * .27;
    const amplitude = innerWidth <= 900 ? 26 : 64;
    // Keep layout reads together, before updating the text transforms.
    const tops = mobile ? textLines.map(() => 0) : textLines.map(({line}) => line.getBoundingClientRect().top);
    settledAfter = mobile ? 0 : Math.max(...tops.map(top => top + scrollY - viewportHeight * .94 + distance));
    settled = true;
    textLines.forEach((item, index) => {
      const {text} = item;
      if (!text) return;
      // The line box stays in place; only its text moves, so reverse scroll is stable.
      const progress = still ? 1 : clamp((viewportHeight * .94 - tops[index]) / distance);
      if (progress < 1) settled = false;
      const arrived = ease(progress);
      const direction = index % 2 ? 1 : -1;
      const x = `${(direction * amplitude * (1 - arrived)).toFixed(2)}px`;
      const y = `${((1 - arrived) * 42).toFixed(2)}px`;
      const turn = `${(direction * (1 - arrived) * 1.8).toFixed(3)}deg`;
      const ink = (.32 + arrived * .68).toFixed(4);
      const written = `${x}|${y}|${turn}|${ink}`;
      if (item.written === written) return;
      item.written = written;
      text.style.setProperty('--question-x', x);
      text.style.setProperty('--question-y', y);
      text.style.setProperty('--question-turn', turn);
      text.style.setProperty('--question-ink', ink);
    });
    if (!panel.classList.contains('brief-motion-ready')) panel.classList.add('brief-motion-ready');
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function refresh() { settled = false; schedule(); }
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', refresh, {passive:true});
  reduced.addEventListener('change', refresh);
  panel.addEventListener('focusin', refresh);
  panel.addEventListener('focusout', refresh);
  document.addEventListener('tenerife:language', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {cancelAnimationFrame(frame);frame = 0;}
    else refresh();
  });
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(title);
  resizeObserver.observe(panel);
  let motionClass = root.classList.contains('motion-off');
  new MutationObserver(() => {
    const nextMotion = root.classList.contains('motion-off');
    if (nextMotion !== motionClass) { motionClass = nextMotion; refresh(); }
  }).observe(root, {attributes:true,attributeFilter:['class']});
  document.fonts?.ready.then(refresh);
  schedule();
})();

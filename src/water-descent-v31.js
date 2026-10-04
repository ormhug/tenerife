(() => {
  'use strict';
  const root = document.documentElement;
  const ocean = document.querySelector('#island-ocean');
  const services = document.querySelector('#services');
  const photo = ocean?.querySelector('.chapter-photo');
  if (!ocean || !services || !photo || services.querySelector('.water-descent')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, className) => {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  };
  const svgElement = (tag, attributes) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };

  const floor = make('div', 'water-ocean-floor');
  floor.setAttribute('aria-hidden', 'true');
  ocean.append(floor);

  const seam = make('div', 'water-descent');
  seam.setAttribute('aria-hidden', 'true');
  seam.setAttribute('role', 'presentation');
  const photograph = make('div', 'water-descent-photo');
  const image = photo.cloneNode(false);
  image.removeAttribute('class');
  image.removeAttribute('id');
  image.removeAttribute('srcset');
  image.removeAttribute('sizes');
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.draggable = false;
  photograph.append(image);

  const surface = svgElement('svg', {class:'water-descent-surface', viewBox:'0 0 1440 220', preserveAspectRatio:'none', 'aria-hidden':'true', focusable:'false'});
  const definitions = svgElement('defs', {});
  const gradient = svgElement('linearGradient', {id:'water-v31-surface', x1:'0', y1:'0', x2:'0', y2:'1'});
  gradient.append(svgElement('stop', {offset:'0', 'stop-color':'#d6dadc', 'stop-opacity':'.94'}), svgElement('stop', {offset:'.5', 'stop-color':'#e2e5e6', 'stop-opacity':'.96'}), svgElement('stop', {offset:'1', 'stop-color':'#eaeced', 'stop-opacity':'0'}));
  definitions.append(gradient);
  surface.append(definitions);
  surface.append(svgElement('path', {class:'water-descent-body', d:'M-60 95 C95 63 170 123 335 91 S565 79 735 98 S965 67 1110 91 S1345 110 1500 77 V240 H-60Z', fill:'url(#water-v31-surface)'}));
  surface.append(svgElement('path', {class:'water-surface-line water-surface-line-front', d:'M-60 95 C95 63 170 123 335 91 S565 79 735 98 S965 67 1110 91 S1345 110 1500 77', fill:'none'}));
  surface.append(svgElement('path', {class:'water-surface-line water-surface-line-back', d:'M-60 80 C70 112 210 68 375 86 S640 103 785 83 S1035 108 1190 82 S1360 69 1500 96', fill:'none'}));
  const foam = make('div', 'water-surface-foam');
  seam.append(photograph, surface, foam);

  const field = make('div', 'water-descent-field');
  field.setAttribute('aria-hidden', 'true');
  const rays = make('div', 'water-descent-rays');
  const caustics = make('div', 'water-descent-caustics');
  const bubbles = make('div', 'water-descent-bubbles');
  [11, 27, 73, 88].forEach((position, index) => {
    const bubble = make('i', 'water-bubble');
    bubble.style.setProperty('--bubble-x', `${position}%`);
    bubble.style.setProperty('--bubble-y', `${[32, 58, 76, 43][index]}px`);
    bubble.style.setProperty('--bubble-size', `${[4, 7, 5, 3][index]}px`);
    bubble.style.setProperty('--bubble-drift', `${[20, 30, 24, 36][index]}px`);
    bubbles.append(bubble);
  });
  field.append(rays, caustics, bubbles);
  services.prepend(seam, field);
  services.classList.add('water-catalog');
  ocean.classList.add('water-ocean-ending');

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  let frame = 0, lastPhase = -1, lastStill = null;
  const still = () => reduced.matches || root.classList.contains('motion-off');

  function render() {
    frame = 0;
    if (document.hidden) return;
    const isStill = still();
    const bounds = services.getBoundingClientRect();
    const height = Math.max(1, innerHeight);
    // The existing island story owns its pinning. This phase uses only the
    // following section's position and adds no scroll distance or interception.
    const phase = isStill ? .5 : smooth((height * .91 - bounds.top) / (height * .73));
    if (isStill !== lastStill) {
      services.classList.toggle('water-descent-still', isStill);
      lastStill = isStill;
    }
    const active = bounds.top < height + 240 && bounds.top > -Math.min(560, bounds.height);
    services.classList.toggle('water-descent-in-view', active && !isStill);
    if (Math.abs(phase - lastPhase) < .0005) return;
    lastPhase = phase;
    const value = phase.toFixed(4);
    services.style.setProperty('--water-phase', value);
    ocean.style.setProperty('--water-phase', value);
    services.style.setProperty('--water-surface-shift', `${isStill ? 0 : (-phase * 28).toFixed(2)}px`);
    services.style.setProperty('--water-flow-x', `${isStill ? 0 : (Math.sin(phase * Math.PI) * 24).toFixed(2)}px`);
    services.style.setProperty('--water-light-shift', `${isStill ? 0 : (-phase * 38).toFixed(2)}px`);
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  reduced.addEventListener('change', schedule);
  document.addEventListener('tenerife:language', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  new ResizeObserver(schedule).observe(services);
  let previousStill = still();
  new MutationObserver(() => {
    const next = still();
    if (next !== previousStill) { previousStill = next; schedule(); }
  }).observe(root, {attributes:true, attributeFilter:['class']});
  schedule();
})();

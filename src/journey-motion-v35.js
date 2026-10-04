(() => {
  'use strict';
  const root = document.documentElement;
  const how = document.querySelector('#how');
  const booking = document.querySelector('#booking');
  const form = booking?.querySelector('#inquiry-form');
  const steps = [...(how?.querySelectorAll('.step') ?? [])];
  const teamLink = how?.querySelector('#about .about-links .button');
  if (!how || !booking || !form || !steps.length) return;
  if (form.querySelector('.booking-form-intro')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || root.classList.contains('motion-off');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);
  const make = (tag, className) => {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  };
  const wording = {
    ru: {title:'Подберём впечатление вместе', text:'Расскажите, что вам нравится и когда вы будете на острове.'},
    uk: {title:'Оберемо враження разом', text:'Розкажіть, що вам подобається і коли ви будете на острові.'},
    en: {title:'Let’s choose your experience', text:'Tell us what you enjoy and when you will be on the island.'},
    es: {title:'Elegimos tu experiencia juntos', text:'Cuéntanos qué te gusta y cuándo estarás en la isla.'}
  };

  // The invitation introduces the fields directly, within the same form surface.
  const intro = make('div', 'booking-form-intro');
  const introTitle = make('h3', 'booking-form-title');
  introTitle.id = 'booking-form-title';
  const introText = make('p', 'booking-form-hint');
  introText.id = 'booking-form-hint';
  intro.append(introTitle, introText);
  form.prepend(intro);
  form.setAttribute('aria-labelledby', introTitle.id);
  form.setAttribute('aria-describedby', introText.id);

  function paint() {
    const text = wording[root.lang] ?? wording.ru;
    introTitle.textContent = text.title;
    introText.textContent = text.text;
  }
  paint();
  steps.forEach((step, index) => {
    step.style.setProperty('--journey-order', index);
    const meter = make('span', 'journey-step-meter');
    meter.setAttribute('aria-hidden', 'true');
    step.append(meter);
  });
  teamLink?.classList.add('journey-team-link');
  how.classList.add('journey-motion-ready');
  booking.classList.add('journey-motion-ready');

  let frame = 0;
  let layoutDirty = true;
  let stepTops = [];
  const lastStepValues = [];
  const lastPhotoValues = [];
  function documentTop(element) {
    // offsetTop ignores the reveal transform, keeping progress reversible without
    // forcing computed style/layout reads on every scroll frame.
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  }
  function render() {
    frame = 0;
    if (document.hidden) return;
    const isStill = still();
    const height = Math.max(1, innerHeight);
    if (layoutDirty) {
      stepTops = steps.map(documentTop);
      layoutDirty = false;
    }
    const y = scrollY;
    steps.forEach((step, index) => {
      // Measure the card, and animate its children. Its existing reveal owns
      // the parent transform, so progress does not feed back into geometry.
      const phase = isStill ? 1 : ease((height * .94 - stepTops[index] + y) / (height * .5));
      const stepValue = phase.toFixed(4);
      const photoValue = `${((1 - phase) * (12 + index * 3)).toFixed(2)}px`;
      if (stepValue !== lastStepValues[index]) {
        step.style.setProperty('--journey-step',stepValue);
        lastStepValues[index] = stepValue;
      }
      if (photoValue !== lastPhotoValues[index]) {
        step.style.setProperty('--journey-photo-y',photoValue);
        lastPhotoValues[index] = photoValue;
      }
    });
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function invalidateLayout() {layoutDirty = true;schedule();}
  function scrollChanged() {
    if (layoutDirty) {schedule();return;}
    if (still()) {
      if(lastStepValues.some(value=>value!=='1.0000'))schedule();
      return;
    }
    const height=Math.max(1,innerHeight),y=scrollY;
    if(stepTops.some((top,index)=>{
      const raw=(height*.94-top+y)/(height*.5);
      return raw>0&&raw<1||lastStepValues[index]!== (raw<=0?'0.0000':'1.0000');
    }))schedule();
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        // Attention accents run once, so returning to the form stays quiet.
        entry.target.classList.add('journey-attention-arrived');
        observer.unobserve(entry.target);
      });
    }, {threshold:.2, rootMargin:'0px 0px -55px 0px'});
    if (teamLink) observer.observe(teamLink);
    observer.observe(form);
  }
  addEventListener('scroll', scrollChanged, {passive:true});
  addEventListener('resize', invalidateLayout, {passive:true});
  reduced.addEventListener('change', schedule);
  booking.addEventListener('focusin', schedule);
  document.addEventListener('tenerife:language', () => {paint();invalidateLayout();});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {cancelAnimationFrame(frame);frame = 0;}
    else schedule();
  });
  let previousStill = still();
  new MutationObserver(() => {
    const next = still();
    if (next !== previousStill) {previousStill = next;schedule();}
  }).observe(root, {attributes:true, attributeFilter:['class']});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidateLayout);
    observer.observe(document.body);
    observer.observe(how);
    observer.observe(booking);
  }
  document.fonts?.ready.then(invalidateLayout);
  schedule();
})();

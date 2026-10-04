(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const rail = $('#experience-rail'), dialog = $('#experience-dialog');
  if (!rail || !dialog || !window.TT_LOCALES) return;
  const section = $('#services');
  let catalogVisible = false;
  const updateDetails = () => section.classList.toggle('catalog-in-view', catalogVisible && !document.hidden);
  new IntersectionObserver(entries => { catalogVisible = entries[0].isIntersecting; updateDetails(); }, {threshold:0}).observe(section);
  document.addEventListener('visibilitychange', updateDetails);
  const cards = [...rail.querySelectorAll('[data-service-card]')];
  const byService = new Map(cards.map(card => [card.dataset.serviceCard, card]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => !reduced.matches && !document.documentElement.classList.contains('motion-off');
  const t = key => window.TT_LOCALES[document.documentElement.lang]?.[key] ?? window.TT_LOCALES.ru[key] ?? key;
  const picker = $('#experience-service'), picture = $('#experience-image');
  const draftDate = $('#experience-date'), draftPeople = $('#experience-people'), draftWishes = $('#experience-wishes');
  const mainForm = $('#inquiry-form'), service = $('#service'), date = $('#date'), people = $('#people'), wishes = $('#wishes');
  const preference = $('#trip-preference'), preferenceOptions = $('#experience-preferences');
  let returnFocus = null, closing = false, closeTimer = 0, afterClose = null, imageVersion = 0;
  let selectedPreferences = new Map();

  function renderExperience() {
    const id = picker.value, card = byService.get(id);
    if (!card) return;
    $('#experience-title').textContent = t(`service.${id}.title`);
    $('#experience-description').textContent = t(`service.${id}.desc`);
    $('#experience-category').textContent = t(`filter.${card.dataset.category}`);
    $('#experience-photo-note').hidden = !card.querySelector('.illustration-tag');
    const source = card.querySelector('img').src.replace('-900.webp', '-1600.webp');
    if (picture.src !== source) {
      const version = ++imageVersion;
      picture.classList.add('is-loading');
      picture.src = source;
      picture.decode().catch(() => {}).finally(() => {
        if (version === imageVersion) picture.classList.remove('is-loading');
      });
    }
    const choices = card.dataset.preferences.split(' ');
    const selected = selectedPreferences.get(id) || 'custom';
    preferenceOptions.replaceChildren(...choices.map(choice => {
      const label = document.createElement('label');
      label.className = 'preference-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'experience-preference'; input.value = choice;
      input.checked = choice === selected;
      input.addEventListener('change', () => selectedPreferences.set(id, choice));
      const caption = document.createElement('span'); caption.textContent = t(`pref.${choice}`);
      label.append(input, caption); return label;
    }));
  }

  function openExperience(id, trigger) {
    if (dialog.open || !byService.has(id)) return;
    clearTimeout(closeTimer); closing = false; afterClose = null;
    dialog.classList.remove('is-closing'); dialog.returnValue = '';
    // Collection and benefit panels reuse links in the hidden source rail.
    // Return to their visible opener rather than attempting to focus that rail.
    returnFocus = trigger?.getClientRects().length ? trigger : document.activeElement;
    selectedPreferences = new Map();
    if (preference.value && preference.dataset.service === id) selectedPreferences.set(id, preference.value);
    picker.value = id;
    draftDate.min = date.min; draftDate.value = date.value;
    draftPeople.value = people.value; draftWishes.value = wishes.value;
    renderExperience();
    document.documentElement.classList.add('experience-opened');
    dialog.showModal(); dialog.scrollTop = 0;
  }

  function closeExperience(callback = null) {
    if (!dialog.open || closing) return;
    closing = true; afterClose = callback;
    dialog.returnValue = callback ? 'booking' : '';
    if (!motion()) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    closeTimer = setTimeout(() => { if (dialog.open) dialog.close(); }, 230);
  }
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer); closing = false;
    if (!document.querySelector('#playlist-panel')?.open && !document.querySelector('#benefit-picker')?.open) {
      document.documentElement.classList.remove('experience-opened');
    }
    dialog.classList.remove('is-closing');
    const callback = afterClose; afterClose = null;
    if (callback) callback();
    else returnFocus?.focus({preventScroll:true});
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeExperience(); });
  $('.experience-close').addEventListener('click', () => closeExperience());
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  let backdropStart = false;
  dialog.addEventListener('pointerdown', event => { backdropStart = event.button === 0 && outside(event); });
  dialog.addEventListener('pointerup', event => { if (backdropStart && outside(event)) closeExperience(); backdropStart = false; });
  dialog.addEventListener('pointercancel', () => { backdropStart = false; });
  picker.addEventListener('change', renderExperience);
  rail.querySelectorAll('[data-experience-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); openExperience(link.dataset.experienceOpen, link);
  }));
  $('#experience-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || closing) return;
    const selected = preferenceOptions.querySelector('input:checked')?.value || 'custom';
    service.value = picker.value; date.value = draftDate.value;
    people.value = draftPeople.value; wishes.value = draftWishes.value;
    preference.value = selected === 'custom' ? '' : selected;
    preference.dataset.service = service.value;
    mainForm.dispatchEvent(new Event('input', {bubbles:true}));
    closeExperience(() => {
      if (window.TT_SCROLL) window.TT_SCROLL.to($('#booking'), {offset:-105});
      else $('#booking').scrollIntoView({behavior:motion()?'smooth':'instant', block:'start'});
      service.focus({preventScroll:true});
    });
  });

  const previous = $('#rail-prev'), next = $('#rail-next'), range = $('#rail-range');
  let railFrame = 0;
  function updateRail() {
    railFrame = 0;
    const visible = cards.filter(card => !card.hidden), bounds = rail.getBoundingClientRect();
    const inView = visible.map((card, i) => ({rect:card.getBoundingClientRect(), i}))
      .filter(({rect}) => Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left) > Math.min(60, rect.width / 3));
    const first = (inView[0]?.i ?? 0) + 1, last = (inView.at(-1)?.i ?? 0) + 1;
    const current = first === last ? String(first) : `${first}-${last}`;
    range.textContent = `${String(first).padStart(2,'0')}${first === last ? '' : ' - '+String(last).padStart(2,'0')} / ${String(visible.length).padStart(2,'0')}`;
    range.setAttribute('aria-label', t('dialog.railCounter').replace('{current}', current).replace('{total}', String(visible.length)));
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    previous.disabled = rail.scrollLeft < 3; next.disabled = rail.scrollLeft >= max - 3;
    const portion = Math.min(1, rail.clientWidth / rail.scrollWidth);
    $('.rail-meter span').style.transform = `scaleX(${portion + (max ? rail.scrollLeft / max : 0) * (1 - portion)})`;
  }
  function scheduleRail() { if (!railFrame) railFrame = requestAnimationFrame(updateRail); }
  function moveRail(direction) {
    const card = cards.find(item => !item.hidden);
    if (!card) return;
    const step = card.offsetWidth + parseFloat(getComputedStyle(rail).gap);
    rail.scrollBy({left:direction*step, behavior:motion()?'smooth':'instant'});
  }
  previous.addEventListener('click', () => moveRail(-1)); next.addEventListener('click', () => moveRail(1));
  rail.addEventListener('scroll', scheduleRail, {passive:true});
  new ResizeObserver(scheduleRail).observe(rail);
  document.addEventListener('tenerife:filter', scheduleRail);
  document.addEventListener('tenerife:language', () => { if (dialog.open) renderExperience(); scheduleRail(); });
  rail.addEventListener('keydown', event => {
    if (event.target !== rail || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key.startsWith('Arrow')) moveRail(event.key === 'ArrowLeft' ? -1 : 1);
    else rail.scrollTo({left:event.key === 'Home' ? 0 : rail.scrollWidth, behavior:motion()?'smooth':'instant'});
  });

  // Touch uses native momentum scrolling. Mouse dragging starts only after a horizontal gesture.
  let drag = null, suppressClick = false, clickTimer = 0;
  rail.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    clearTimeout(clickTimer); suppressClick = false;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, left:rail.scrollLeft, active:false};
  });
  rail.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.active && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      drag.active = true; rail.classList.add('is-dragging'); rail.setPointerCapture(event.pointerId);
    }
    if (drag.active) { event.preventDefault(); rail.scrollLeft = drag.left - dx; }
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.active;
    if (rail.hasPointerCapture(drag.id)) rail.releasePointerCapture(drag.id);
    rail.classList.remove('is-dragging'); drag = null;
    clickTimer = setTimeout(() => { suppressClick = false; }, 250);
  }
  rail.addEventListener('pointerup', finishDrag); rail.addEventListener('pointercancel', finishDrag);
  rail.addEventListener('pointerleave', event => { if (drag && !drag.active) finishDrag(event); });
  rail.addEventListener('dragstart', event => event.preventDefault());
  rail.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  scheduleRail();
})();

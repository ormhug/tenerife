(() => {
  'use strict';
  const section = document.querySelector('#services');
  const rail = section?.querySelector('#experience-rail');
  const cards = [...(rail?.querySelectorAll('[data-service-card]') || [])];
  if (!section || !rail || !cards.length) return;

  // Keep the original cards and their dialog listeners. The collection picker
  // uses the existing filters, including shortcuts elsewhere on the page.
  const categories = ['tours', 'ocean', 'road', 'photo'];
  const groups = new Map(categories.map(category =>
    [category, cards.filter(card => card.dataset.category === category)]
  ).filter(([, items]) => items.length));
  if (!groups.size) return;
  const filters = [...section.querySelectorAll('[data-filter]')];
  const experienceDialog = document.querySelector('#experience-dialog');
  if (!experienceDialog) return;
  const root = document.documentElement;
  const fallback = {
    ru: {
      'playlist.choose': 'Выберите подборку',
      'playlist.open': 'Смотреть подборку',
      'playlist.tours.note': 'Тейде, Маска, Анага и побережье',
      'playlist.ocean.note': 'Прогулка на яхте или JetSki',
      'playlist.road.note': 'Квадроциклы, автомобиль и Mustang',
      'playlist.photo.note': 'Фотосессия на острове',
      'playlist.count.one': '{count} вариант',
      'playlist.count.few': '{count} варианта',
      'playlist.count.many': '{count} вариантов',
      'playlist.count.other': '{count} вариантов'
    },
    uk: {
      'playlist.choose': 'Оберіть добірку',
      'playlist.open': 'Дивитися добірку',
      'playlist.tours.note': 'Тейде, Маска, Анага та узбережжя',
      'playlist.ocean.note': 'Прогулянка на яхті або JetSki',
      'playlist.road.note': 'Квадроцикли, автомобіль і Mustang',
      'playlist.photo.note': 'Фотосесія на острові',
      'playlist.count.one': '{count} варіант',
      'playlist.count.few': '{count} варіанти',
      'playlist.count.many': '{count} варіантів',
      'playlist.count.other': '{count} варіантів'
    },
    en: {
      'playlist.choose': 'Choose a collection',
      'playlist.open': 'Explore collection',
      'playlist.tours.note': 'Teide, Masca, Anaga and the coast',
      'playlist.ocean.note': 'A yacht trip or JetSki',
      'playlist.road.note': 'Quads, a rental car and Mustang',
      'playlist.photo.note': 'A photo session on the island',
      'playlist.count.one': '{count} option',
      'playlist.count.other': '{count} options'
    },
    es: {
      'playlist.choose': 'Elige una colección',
      'playlist.open': 'Ver colección',
      'playlist.tours.note': 'Teide, Masca, Anaga y la costa',
      'playlist.ocean.note': 'Un paseo en yate o JetSki',
      'playlist.road.note': 'Quads, coche de alquiler y Mustang',
      'playlist.photo.note': 'Una sesión de fotos en la isla',
      'playlist.count.one': '{count} opción',
      'playlist.count.other': '{count} opciones'
    }
  };
  const panelFallback = {
    ru: {'playlist.panel.title':'Выберите впечатление', 'playlist.panel.description':'Откройте вариант, чтобы узнать детали и отправить запрос.', 'playlist.panel.close':'Закрыть подборку', 'playlist.panel.back':'К подборке'},
    uk: {'playlist.panel.title':'Оберіть враження', 'playlist.panel.description':'Відкрийте варіант, щоб дізнатися деталі й надіслати запит.', 'playlist.panel.close':'Закрити добірку', 'playlist.panel.back':'До добірки'},
    en: {'playlist.panel.title':'Choose an experience', 'playlist.panel.description':'Open an option to explore the details and make an enquiry.', 'playlist.panel.close':'Close collection', 'playlist.panel.back':'Back to collection'},
    es: {'playlist.panel.title':'Elige una experiencia', 'playlist.panel.description':'Abre una opción para conocer los detalles y enviar una consulta.', 'playlist.panel.close':'Cerrar colección', 'playlist.panel.back':'Volver a la colección'}
  };
  const lang = () => fallback[document.documentElement.lang] ? document.documentElement.lang : 'ru';
  const t = key => window.TT_LOCALES?.[lang()]?.[key]
    ?? fallback[lang()]?.[key] ?? panelFallback[lang()]?.[key]
    ?? window.TT_LOCALES?.ru?.[key] ?? fallback.ru[key] ?? panelFallback.ru[key] ?? key;
  const countText = count => t(`playlist.count.${new Intl.PluralRules(lang()).select(count)}`).replace('{count}', count);
  const make = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };

  const panel = make('dialog', 'playlist-panel');
  panel.id = 'playlist-panel';
  panel.setAttribute('aria-labelledby', 'playlist-panel-title');
  panel.setAttribute('aria-describedby', 'playlist-panel-description');
  panel.setAttribute('data-lenis-prevent', '');
  const panelClose = make('button', 'playlist-panel-close', '×');
  panelClose.type = 'button';
  panelClose.autofocus = true;
  const panelLayout = make('div', 'playlist-panel-layout');
  const panelVisual = make('div', 'playlist-panel-visual');
  const panelImage = make('img', 'playlist-panel-image');
  panelImage.alt = '';
  panelImage.decoding = 'async';
  panelImage.width = 1600;
  panelImage.height = 1000;
  const panelCover = make('div', 'playlist-panel-cover');
  const panelCoverTitle = make('strong', 'playlist-panel-cover-title');
  const panelCoverNote = make('p', 'playlist-panel-cover-note');
  panelCover.append(panelCoverTitle, panelCoverNote);
  panelVisual.append(panelImage, panelCover);
  const panelBody = make('div', 'playlist-panel-body');
  const panelHeader = make('header', 'playlist-panel-header');
  const panelKicker = make('span', 'playlist-panel-kicker');
  const panelTitle = make('h2', 'playlist-panel-title');
  panelTitle.id = 'playlist-panel-title';
  const panelDescription = make('p', 'playlist-panel-description');
  panelDescription.id = 'playlist-panel-description';
  const panelOptions = make('div', 'playlist-panel-options');
  panelHeader.append(panelKicker, panelTitle, panelDescription);
  panelBody.append(panelHeader, panelOptions);
  panelLayout.append(panelVisual, panelBody);
  panel.append(panelClose, panelLayout);
  document.body.append(panel);

  const detailBack = make('button', 'playlist-detail-back');
  detailBack.type = 'button';
  detailBack.hidden = true;
  const detailBackArrow = make('span', '', '←');
  detailBackArrow.setAttribute('aria-hidden', 'true');
  const detailBackText = make('span');
  detailBack.append(detailBackArrow, detailBackText);
  experienceDialog.querySelector('.experience-config')?.prepend(detailBack);
  detailBack.addEventListener('click', () => experienceDialog.querySelector('.experience-close')?.click());

  let returnFocus = null, detailFlow = null, backdropStart = false;
  let collectionReveal = null, panelRevealTimer = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reducedMotion.matches && !root.classList.contains('motion-off');

  function clearPanelReveal() {
    clearTimeout(panelRevealTimer);
    panel.classList.remove('is-collection-revealing');
  }

  function completeCollectionReveal(state, open = true, animate = true) {
    if (collectionReveal !== state) return;
    collectionReveal = null;
    clearTimeout(state.timeout);
    state.animation?.cancel();
    document.removeEventListener('keydown', state.onKey, true);
    window.removeEventListener('resize', state.onResize);
    if (state.busy === null) state.origin.removeAttribute('aria-busy');
    else state.origin.setAttribute('aria-busy', state.busy);
    root.classList.remove('collection-reveal-pending');

    if (open && !document.querySelector('dialog[open]')) {
      // The native backdrop replaces the solid cover in the same frame. The
      // panel only enters once every corner of the viewport is orange.
      panel.classList.add('collection-from-brief');
      if (animate && motionAllowed()) panel.classList.add('is-collection-revealing');
      openCollection(state.category, '', state.origin);
      if (panel.classList.contains('is-collection-revealing')) {
        panelRevealTimer = setTimeout(clearPanelReveal, 400);
      }
    }
    state.cover.remove();
    if (!panel.open) {
      clearPanelReveal();
      panel.classList.remove('collection-from-brief');
      if (!document.querySelector('dialog[open]')) root.classList.remove('experience-opened');
      if (!open && document.visibilityState !== 'hidden') state.origin.focus({preventScroll:true});
    }
  }

  function revealCollection(category, origin, event) {
    if (collectionReveal || !groups.has(category) || document.querySelector('dialog[open]')) return;
    if (!motionAllowed() || !Element.prototype.animate) {
      openCollection(category, '', origin);
      return;
    }

    const bounds = origin.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth, event.detail ? event.clientX : bounds.left + bounds.width / 2));
    const y = Math.max(0, Math.min(innerHeight, event.detail ? event.clientY : bounds.top + bounds.height / 2));
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 32;
    const cover = make('div', 'collection-reveal-cover');
    cover.setAttribute('aria-hidden', 'true');
    cover.setAttribute('data-lenis-prevent', '');
    const circle = make('span', 'collection-reveal-circle');
    circle.style.cssText = `left:${x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px`;
    cover.append(circle);
    const state = {category, origin, cover, animation:null, timeout:0, busy:origin.getAttribute('aria-busy')};
    collectionReveal = state;
    state.onKey = key => {
      if (key.key === 'Escape') {
        key.preventDefault();
        key.stopImmediatePropagation();
        completeCollectionReveal(state, false);
      } else if (['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(key.key)) {
        key.preventDefault();
        key.stopImmediatePropagation();
      }
    };
    state.onResize = () => completeCollectionReveal(state, true, false);
    document.addEventListener('keydown', state.onKey, true);
    window.addEventListener('resize', state.onResize, {once:true});
    cover.addEventListener('wheel', wheel => wheel.preventDefault(), {passive:false});
    cover.addEventListener('touchmove', touch => touch.preventDefault(), {passive:false});
    origin.setAttribute('aria-busy', 'true');
    root.classList.add('collection-reveal-pending', 'experience-opened');
    document.body.append(cover);
    state.animation = circle.animate(
      [{transform:'scale(0)'}, {transform:'scale(1)'}],
      {duration:440, easing:'cubic-bezier(.65,0,.35,1)', fill:'forwards'}
    );
    state.animation.finished.then(() => completeCollectionReveal(state), () => {});
    // Also finish when a browser suspends animation promises in a hidden tab.
    state.timeout = setTimeout(() => completeCollectionReveal(state), 540);
  }

  panel.addEventListener('animationend', event => {
    if (event.target === panel && event.animationName === 'collection-panel-reveal') clearPanelReveal();
  });
  const finishReducedReveal = () => {
    if (!motionAllowed()) {
      if (collectionReveal) completeCollectionReveal(collectionReveal, true, false);
      clearPanelReveal();
    }
  };
  reducedMotion.addEventListener('change', finishReducedReveal);
  new MutationObserver(finishReducedReveal).observe(root, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && collectionReveal) completeCollectionReveal(collectionReveal, true, false);
  });
  window.addEventListener('pagehide', () => {
    if (collectionReveal) completeCollectionReveal(collectionReveal, false);
    clearPanelReveal();
  });

  const chooser = make('div', 'playlist-categories');
  chooser.setAttribute('role', 'group');
  const entries = new Map();
  groups.forEach((items, category) => {
    const button = make('button', 'playlist-category');
    button.type = 'button';
    button.dataset.playlist = category;
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-labelledby', `playlist-title-${category} playlist-action-${category}`);
    const art = make('span', 'playlist-art');
    art.setAttribute('aria-hidden', 'true');
    const source = items[0].querySelector('.card-art img');
    if (source) {
      const image = make('img');
      image.src = source.currentSrc || source.src;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = Number(source.getAttribute('width')) || 1600;
      image.height = Number(source.getAttribute('height')) || 1000;
      art.append(image);
    }
    const count = make('span', 'playlist-count');
    const copy = make('span', 'playlist-copy');
    const title = make('strong', 'playlist-title');
    title.id = `playlist-title-${category}`;
    const note = make('span', 'playlist-note');
    const action = make('span', 'playlist-action');
    const caption = make('span');
    caption.id = `playlist-action-${category}`;
    const arrow = make('span', 'playlist-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    action.append(caption, arrow);
    copy.append(title, note, action);
    button.append(art, count, copy);
    button.addEventListener('click', () => openCollection(category));
    chooser.append(button);
    entries.set(category, {button, title, note, caption, count, size: items.length});
  });

  const selection = make('div', 'playlist-selection');
  const selectedTitle = make('h3', 'playlist-selection-title');
  selectedTitle.id = 'playlist-selection-title';
  const selectedCount = make('p', 'playlist-selection-count');
  selectedCount.setAttribute('role', 'status');
  selectedCount.setAttribute('aria-live', 'polite');
  selection.append(selectedTitle, selectedCount);
  rail.before(chooser, selection);
  rail.setAttribute('aria-labelledby', selectedTitle.id);
  rail.removeAttribute('tabindex');
  rail.hidden = true;
  rail.inert = true;
  selection.hidden = true;
  section.querySelector('.catalog-tools')?.setAttribute('hidden', '');
  section.querySelector('.rail-footer')?.setAttribute('hidden', '');
  section.classList.add('playlists-ready', 'playlist-panels-ready');
  let active = groups.has('tours') ? 'tours' : groups.keys().next().value;

  function paint() {
    chooser.setAttribute('aria-label', t('playlist.choose'));
    entries.forEach((entry, category) => {
      entry.title.textContent = t(`filter.${category}`);
      entry.note.textContent = t(`playlist.${category}.note`);
      entry.caption.textContent = t('playlist.open');
      entry.count.textContent = countText(entry.size);
      const expanded = category === active && panel.open;
      entry.button.classList.toggle('is-selected', expanded);
      entry.button.setAttribute('aria-expanded', String(expanded));
    });
    selectedTitle.textContent = t(`filter.${active}`);
    selectedCount.textContent = `${t(`filter.${active}`)}: ${countText(groups.get(active).length)}`;
    rail.dataset.playlist = active;
    detailBackText.textContent = t('playlist.panel.back');
    if (panel.open) renderPanel();
  }
  function renderPanel() {
    const focusedService = panel.contains(document.activeElement)
      ? document.activeElement.closest('[data-playlist-service]')?.dataset.playlistService : null;
    const bodyScroll = panelBody.scrollTop, panelScroll = panel.scrollTop;
    const items = groups.get(active);
    panel.dataset.playlist = active;
    panelClose.setAttribute('aria-label', t('playlist.panel.close'));
    panelKicker.textContent = t('playlist.choose') + ' · ' + t('filter.' + active);
    panelTitle.textContent = t('playlist.panel.title');
    panelDescription.textContent = countText(items.length) + ' · ' + t('playlist.panel.description');
    panelCoverTitle.textContent = t('filter.' + active);
    panelCoverNote.textContent = t('playlist.' + active + '.note');
    const cover = items[0].querySelector('.card-art img');
    if (cover) {
      const source = cover.currentSrc || cover.src;
      if (panelImage.src !== source) panelImage.src = source;
    }
    panelOptions.replaceChildren(...items.map(card => {
      const id = card.dataset.serviceCard;
      const choice = make('button', 'playlist-option');
      choice.type = 'button';
      choice.dataset.playlistService = id;
      choice.setAttribute('aria-haspopup', 'dialog');
      choice.setAttribute('aria-controls', experienceDialog.id);
      choice.setAttribute('aria-labelledby', 'playlist-option-title-' + id);
      choice.setAttribute('aria-describedby', 'playlist-option-description-' + id);
      const picture = make('span', 'playlist-option-picture');
      const source = card.querySelector('img');
      if (source) {
        const image = make('img');
        image.src = source.currentSrc || source.src;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        picture.append(image);
      }
      const copy = make('span', 'playlist-option-copy');
      const title = make('strong', '', t('service.' + id + '.title'));
      title.id = 'playlist-option-title-' + id;
      const description = make('p', 'playlist-option-description', t('service.' + id + '.desc'));
      description.id = 'playlist-option-description-' + id;
      const action = make('span', 'playlist-option-action');
      const actionText = make('span', '', t('dialog.open'));
      const arrow = make('span', '', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      action.append(actionText, arrow);
      copy.append(title, description, action);
      choice.append(picture, copy);
      choice.addEventListener('click', () => chooseService(id));
      return choice;
    }));
    panelBody.scrollTop = bodyScroll;
    panel.scrollTop = panelScroll;
    if (focusedService && panel.open) panelOptions.querySelector('[data-playlist-service="' + focusedService + '"]')?.focus({preventScroll:true});
  }
  function select(category) {
    if (!groups.has(category)) return;
    active = category;
    const filter = filters.find(button => button.dataset.filter === category);
    if (filter) filter.click();
    else cards.forEach(card => {
      card.hidden = card.dataset.category !== category;
      card.classList.add('is-visible');
    });
    paint();
  }
  function openCollection(category, focusService = '', origin = null) {
    if (!groups.has(category) || experienceDialog.open || panel.open) return;
    select(category);
    returnFocus = origin || entries.get(category).button;
    renderPanel();
    panel.returnValue = '';
    root.classList.add('playlist-panel-opened', 'experience-opened');
    panel.showModal();
    panel.scrollTop = panelBody.scrollTop = 0;
    entries.get(category).button.setAttribute('aria-expanded', 'true');
    entries.get(category).button.classList.add('is-selected');
    if (focusService) panelOptions.querySelector('[data-playlist-service="' + focusService + '"]')?.focus({preventScroll:true});
  }
  function chooseService(id) {
    if (!panel.open || experienceDialog.open) return;
    const card = groups.get(active).find(item => item.dataset.serviceCard === id);
    const existing = card?.querySelector('[data-experience-open]');
    if (!existing) return;
    detailFlow = {category:active, service:id, origin:returnFocus};
    detailBack.hidden = false;
    experienceDialog.classList.add('playlist-detail-active');
    panel.close('service');
    existing.click();
    if (!experienceDialog.open) {
      const category = detailFlow.category;
      const origin = detailFlow.origin;
      detailFlow = null;
      detailBack.hidden = true;
      experienceDialog.classList.remove('playlist-detail-active');
      setTimeout(() => openCollection(category, id, origin), 0);
    }
  }
  panelClose.addEventListener('click', () => panel.close(''));
  panel.addEventListener('cancel', () => {panel.returnValue = '';});
  panel.addEventListener('close', () => {
    if (panel.open) return;
    clearPanelReveal();
    panel.classList.remove('collection-from-brief');
    root.classList.remove('playlist-panel-opened');
    entries.forEach(entry => {
      entry.button.setAttribute('aria-expanded', 'false');
      entry.button.classList.remove('is-selected');
    });
    if (!experienceDialog.open && !document.querySelector('#benefit-picker')?.open) root.classList.remove('experience-opened');
    if (!panel.returnValue) {
      detailFlow = null;
      detailBack.hidden = true;
      experienceDialog.classList.remove('playlist-detail-active');
      returnFocus?.focus({preventScroll:true});
    }
  });
  const outside = event => {
    const bounds = panel.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  panel.addEventListener('pointerdown', event => {backdropStart = event.button === 0 && outside(event);});
  panel.addEventListener('pointerup', event => {
    if (backdropStart && outside(event)) panel.close('');
    backdropStart = false;
  });
  panel.addEventListener('pointercancel', () => {backdropStart = false;});
  experienceDialog.addEventListener('close', () => {
    const previous = detailFlow;
    detailFlow = null;
    detailBack.hidden = true;
    experienceDialog.classList.remove('playlist-detail-active');
    if (previous && experienceDialog.returnValue !== 'booking') openCollection(previous.category, previous.service, previous.origin);
  });
  // The source rail is hidden by the collection layout. A shortcut should
  // open its actual options, and dismissal should return to that shortcut.
  document.querySelectorAll('a[data-shortcut]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey
        || event.shiftKey || event.altKey || !groups.has(link.dataset.shortcut)) return;
      event.preventDefault();
      if (link.classList.contains('brief-go')) revealCollection(link.dataset.shortcut, link, event);
      else openCollection(link.dataset.shortcut, '', link);
    });
  });
  document.addEventListener('tenerife:filter', () => {
    const chosen = filters.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.filter;
    if (groups.has(chosen)) {active = chosen; paint();}
    else if (chosen === 'all') {
      // The collection layout always shows one concise list, even when an old
      // all-services shortcut is activated by another component.
      select(active);
    }
  });
  document.addEventListener('tenerife:language', paint);
  rail.addEventListener('click', event => {
    const card = event.target.closest('[data-experience-open]')?.closest('[data-service-card]');
    // A benefit picker can open a service outside the current collection.
    // Keep the collection selection consistent without opening another panel.
    if (card && card.dataset.category !== active) select(card.dataset.category);
  });
  const initial = filters.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.filter;
  select(groups.has(initial) ? initial : active);
})();

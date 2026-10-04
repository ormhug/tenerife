(() => {
  'use strict';
  const root = document.documentElement;
  const triggers = [...document.querySelectorAll('[data-benefit-open]')];
  const rail = document.querySelector('#experience-rail');
  const experienceDialog = document.querySelector('#experience-dialog');
  if (!triggers.length || !rail || !experienceDialog) return;

  const groups = {
    route: ['teide', 'masca', 'north', 'coast'],
    experiences: ['yacht', 'jetski', 'quad', 'car', 'mustang', 'photo'],
    contact: ['teide', 'masca', 'north', 'coast', 'yacht', 'jetski', 'quad', 'car', 'mustang', 'photo']
  };
  const fallback = {
    ru: {'benefit.kicker':'Начните с желания', 'benefit.route.title':'Ваш маршрут', 'benefit.experiences.title':'Ваши впечатления', 'benefit.contact.title':'На связи с вами', 'benefit.route.description':'Выберите направление. Детали и остановки согласуем вместе.', 'benefit.experiences.description':'Как вы хотите провести свой день на острове?', 'benefit.contact.description':'Выберите впечатление или расскажите нам о своих пожеланиях.', 'benefit.close':'Закрыть выбор', 'benefit.help':'Помогите мне выбрать', 'benefit.optionHint':'Открыть варианты'},
    uk: {'benefit.kicker':'Почніть із бажання', 'benefit.route.title':'Ваш маршрут', 'benefit.experiences.title':'Ваші враження', 'benefit.contact.title':'На зв’язку з вами', 'benefit.route.description':'Оберіть напрямок. Деталі й зупинки узгодимо разом.', 'benefit.experiences.description':'Як ви хочете провести свій день на острові?', 'benefit.contact.description':'Оберіть враження або розкажіть нам про свої побажання.', 'benefit.close':'Закрити вибір', 'benefit.help':'Допоможіть мені обрати', 'benefit.optionHint':'Відкрити варіанти'},
    en: {'benefit.kicker':'Start with a wish', 'benefit.route.title':'Your itinerary', 'benefit.experiences.title':'Your experiences', 'benefit.contact.title':'Let’s make a plan', 'benefit.route.description':'Choose a destination. We will plan the details and stops together.', 'benefit.experiences.description':'How would you like to spend your day on the island?', 'benefit.contact.description':'Choose an experience or tell us what you have in mind.', 'benefit.close':'Close choices', 'benefit.help':'Help me choose', 'benefit.optionHint':'Explore options'},
    es: {'benefit.kicker':'Empieza con un deseo', 'benefit.route.title':'Tu ruta', 'benefit.experiences.title':'Tus experiencias', 'benefit.contact.title':'Planeamos contigo', 'benefit.route.description':'Elige un destino. Acordaremos los detalles y las paradas juntos.', 'benefit.experiences.description':'¿Cómo quieres pasar tu día en la isla?', 'benefit.contact.description':'Elige una experiencia o cuéntanos lo que tienes en mente.', 'benefit.close':'Cerrar opciones', 'benefit.help':'Ayudadme a elegir', 'benefit.optionHint':'Ver opciones'}
  };
  const t = key => window.TT_LOCALES?.[root.lang]?.[key] ?? fallback[root.lang]?.[key] ?? window.TT_LOCALES?.ru?.[key] ?? fallback.ru[key] ?? key;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const dialog = make('dialog', 'benefit-picker');
  dialog.id = 'benefit-picker';
  dialog.setAttribute('aria-labelledby', 'benefit-picker-title');
  dialog.setAttribute('aria-describedby', 'benefit-picker-description');
  dialog.setAttribute('data-lenis-prevent', '');
  const close = make('button', 'benefit-picker-close', '×');
  close.type = 'button';
  const header = make('div', 'benefit-picker-heading');
  const kicker = make('span', 'benefit-picker-kicker');
  const title = make('h2');
  title.id = 'benefit-picker-title';
  const description = make('p');
  description.id = 'benefit-picker-description';
  header.append(kicker, title, description);
  const options = make('div', 'benefit-picker-options');
  const help = make('button', 'benefit-picker-help');
  help.type = 'button';
  dialog.append(close, header, options, help);
  document.body.append(dialog);
  let activeGroup = 'route', returnFocus = null, detailReturnFocus = null, backdropStart = false;

  function render() {
    kicker.textContent = t('benefit.kicker');
    title.textContent = t(`benefit.${activeGroup}.title`);
    description.textContent = t(`benefit.${activeGroup}.description`);
    close.setAttribute('aria-label', t('benefit.close'));
    help.textContent = t('benefit.help');
    options.replaceChildren(...groups[activeGroup].map(id => {
      const card = rail.querySelector(`[data-service-card="${id}"]`);
      const existing = card?.querySelector('[data-experience-open]');
      if (!existing) return null;
      const choice = make('button', 'benefit-choice');
      choice.type = 'button';
      choice.dataset.benefitService = id;
      choice.setAttribute('aria-haspopup', 'dialog');
      choice.setAttribute('aria-controls', 'experience-dialog');
      const picture = make('span', 'benefit-choice-picture');
      const image = make('img');
      image.src = card.querySelector('img').getAttribute('src');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      picture.append(image);
      const content = make('span', 'benefit-choice-copy');
      content.append(make('small', 'benefit-choice-category', t(`filter.${card.dataset.category}`)), make('strong', '', t(`service.${id}.title`)), make('span', 'benefit-choice-hint', t('benefit.optionHint') + ' ↗'));
      choice.append(picture, content);
      choice.addEventListener('click', () => {
        detailReturnFocus = {trigger: returnFocus, original: existing};
        dialog.close('service');
        // Catalog owns the detail form and its existing listeners. Reuse that
        // entry point so dates, guest counts and preferences stay in one flow.
        existing.click();
      });
      return choice;
    }).filter(Boolean));
  }

  triggers.forEach(trigger => {
    trigger.setAttribute('aria-controls', dialog.id);
    trigger.addEventListener('click', () => {
      if (dialog.open || experienceDialog.open || !groups[trigger.dataset.benefitOpen]) return;
      returnFocus = trigger;
      activeGroup = trigger.dataset.benefitOpen;
      render();
      dialog.returnValue = '';
      root.classList.add('benefit-picker-opened', 'experience-opened');
      dialog.showModal();
      dialog.scrollTop = 0;
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', () => { dialog.returnValue = ''; });
  dialog.addEventListener('close', () => {
    root.classList.remove('benefit-picker-opened');
    if (!experienceDialog.open) root.classList.remove('experience-opened');
    if (!dialog.returnValue) returnFocus?.focus({preventScroll:true});
  });
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdropStart = event.button === 0 && outside(event); });
  dialog.addEventListener('pointerup', event => {
    if (backdropStart && outside(event)) dialog.close();
    backdropStart = false;
  });
  dialog.addEventListener('pointercancel', () => { backdropStart = false; });
  help.addEventListener('click', () => {
    const service = document.querySelector('#service');
    const preference = document.querySelector('#trip-preference');
    const booking = document.querySelector('#booking');
    if (!service || !booking) return;
    service.value = 'custom';
    if (preference) { preference.value = ''; preference.dataset.service = 'custom'; }
    document.querySelector('#inquiry-form')?.dispatchEvent(new Event('input', {bubbles:true}));
    dialog.close('help');
    requestAnimationFrame(() => {
      if (window.TT_SCROLL) window.TT_SCROLL.to(booking, {offset:-105});
      else booking.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth', block:'start'});
      service.focus({preventScroll:true});
    });
  });
  experienceDialog.addEventListener('close', () => {
    const previous = detailReturnFocus;
    detailReturnFocus = null;
    // Confirmation sends focus to the main form; dismissal returns to the card
    // that started this flow, even when the source catalog card is filtered out.
    if (previous && document.activeElement === previous.original) previous.trigger?.focus({preventScroll:true});
  });
  document.addEventListener('tenerife:language', () => { if (dialog.open) render(); });
})();

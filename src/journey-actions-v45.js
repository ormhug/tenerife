(() => {
  'use strict';
  const root = document.documentElement;
  const steps = [...document.querySelectorAll('#how .step')];
  if (!steps.length || document.querySelector('#journey-detail')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const words = {
    ru: {more:'Подробнее', close:'Закрыть', action:'Обсудить поездку', notes:[
      ['Выберите интересующую услугу.', 'Укажите дату и количество гостей. Дату можно согласовать позже.', 'Добавьте пожелания и отправьте подготовленный запрос в WhatsApp.'],
      ['Расскажите, откуда удобно начать поездку и что хотите увидеть.', 'Уточним маршрут, остановки и доступность на вашу дату.', 'Обсудим итоговую стоимость и условия до бронирования.'],
      ['Сначала согласуем программу, дату и стоимость.', 'Затем отдельно уточним подтверждение и следующий шаг.', 'Отправленный запрос сам по себе ещё не является бронированием.']
    ]},
    uk: {more:'Докладніше', close:'Закрити', action:'Обговорити поїздку', notes:[
      ['Оберіть послугу, яка вас цікавить.', 'Укажіть дату та кількість гостей. Дату можна узгодити пізніше.', 'Додайте побажання та надішліть підготовлений запит у WhatsApp.'],
      ['Розкажіть, звідки зручно почати поїздку і що хочете побачити.', 'Уточнимо маршрут, зупинки й доступність на вашу дату.', 'Обговоримо остаточну вартість та умови до бронювання.'],
      ['Спочатку узгодимо програму, дату й вартість.', 'Потім окремо уточнимо підтвердження та наступний крок.', 'Надісланий запит сам по собі ще не є бронюванням.']
    ]},
    en: {more:'Find out more', close:'Close', action:'Plan your trip', notes:[
      ['Choose the experience you are interested in.', 'Add your preferred date and guest count. You can agree on the date later.', 'Include your wishes, then send the prepared enquiry via WhatsApp.'],
      ['Tell us where you would like to start and what you want to see.', 'We will discuss the route, stops and availability for your date.', 'We will agree on the total price and conditions before booking.'],
      ['First, we agree on the programme, date and price.', 'We then clarify confirmation and the next step separately.', 'Sending an enquiry does not by itself confirm a booking.']
    ]},
    es: {more:'Saber más', close:'Cerrar', action:'Planifica tu viaje', notes:[
      ['Elige la experiencia que te interesa.', 'Indica la fecha y el número de personas. Puedes acordar la fecha más adelante.', 'Añade tus preferencias y envía la consulta preparada por WhatsApp.'],
      ['Cuéntanos desde dónde quieres salir y qué te gustaría ver.', 'Acordaremos la ruta, las paradas y la disponibilidad para tu fecha.', 'Hablaremos del precio total y las condiciones antes de reservar.'],
      ['Primero acordamos el programa, la fecha y el precio.', 'Después aclaramos la confirmación y el siguiente paso por separado.', 'Enviar una consulta no confirma una reserva por sí solo.']
    ]}
  };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const dialog = make('dialog', 'journey-detail');
  dialog.id = 'journey-detail';
  dialog.setAttribute('aria-labelledby', 'journey-detail-title');
  dialog.setAttribute('aria-describedby', 'journey-detail-text');
  dialog.setAttribute('data-lenis-prevent', '');
  const image = make('img', 'journey-detail-image');
  image.alt = '';
  image.decoding = 'async';
  const close = make('button', 'journey-detail-close', '×');
  close.type = 'button';
  const body = make('div', 'journey-detail-body');
  const title = make('h2', 'journey-detail-title');
  title.id = 'journey-detail-title';
  const text = make('p', 'journey-detail-text');
  text.id = 'journey-detail-text';
  const list = make('ul', 'journey-detail-list');
  const action = make('button', 'journey-detail-action');
  action.type = 'button';
  body.append(title, text, list, action);
  dialog.append(image, close, body);
  document.body.append(dialog);
  const pictures = ['coast', 'masca', 'ocean'];
  let active = 0, opener = null, nextField = null, backdropStart = false;
  const buttons = steps.map((step, index) => {
    const heading = step.querySelector('h3');
    if (!heading.id) heading.id = `journey-step-title-${index + 1}`;
    const button = make('button', 'journey-step-open');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    const label = make('span', 'journey-step-open-label');
    label.id = `journey-step-open-${index + 1}`;
    const arrow = make('span', 'journey-step-open-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-labelledby', `${heading.id} ${label.id}`);
    button.append(label, arrow);
    step.append(button);
    step.classList.add('journey-step-actionable');
    button.addEventListener('click', () => {
      if (document.querySelector('dialog[open]')) return;
      active = index;
      opener = button;
      nextField = null;
      render();
      dialog.returnValue = '';
      root.classList.add('experience-opened');
      dialog.showModal();
      dialog.scrollTop = 0;
    });
    return label;
  });
  function render() {
    const locale = words[root.lang] || words.ru;
    buttons.forEach(label => { label.textContent = locale.more; });
    close.setAttribute('aria-label', locale.close);
    action.textContent = window.TT_LOCALES?.[root.lang]?.['nav.booking'] || locale.action;
    title.textContent = steps[active].querySelector('h3').textContent;
    text.textContent = steps[active].querySelector('p').textContent;
    image.src = `assets/${pictures[active]}-photo-900.webp`;
    list.replaceChildren(...locale.notes[active].map(item => make('li', '', item)));
  }
  close.addEventListener('click', () => dialog.close());
  action.addEventListener('click', () => {
    nextField = document.querySelector(active === 0 ? '#service' : '#wishes');
    dialog.close('continue');
  });
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) root.classList.remove('experience-opened');
    const field = nextField;
    nextField = null;
    if (!field) { opener?.focus({preventScroll:true}); return; }
    requestAnimationFrame(() => {
      field.focus({preventScroll:true});
      if (window.TT_SCROLL) window.TT_SCROLL.to(field, {offset:-130});
      else field.scrollIntoView({block:'center', behavior:reduced.matches || root.classList.contains('motion-off') ? 'instant' : 'smooth'});
    });
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
  document.addEventListener('tenerife:language', render);
  render();
})();

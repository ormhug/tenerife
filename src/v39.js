(() => {
  'use strict';

  /* ---------- 1. Open the collection shown in the photo ---------- */
  const widget = document.querySelector('.photo-widget');
  const go = document.querySelector('.brief-go');
  const categories = ['tours', 'ocean', 'road'];
  function syncCollection(index) {
    if (go) go.dataset.shortcut = categories[index] || 'tours';
  }
  if (widget) {
    new MutationObserver(() => syncCollection(Number(widget.dataset.active) || 0))
      .observe(widget, {attributes: true, attributeFilter: ['data-active']});
    syncCollection(Number(widget.dataset.active) || 0);
  }

  /* ---------- 2. Sliding pill in the header navigation ---------- */
  const nav = document.querySelector('.main-nav');
  if (nav) {
    const pill = document.createElement('span');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.prepend(pill);
    nav.classList.add('has-pill');
    const links = [...nav.querySelectorAll('a')];
    let hovered = null;
    const place = target => {
      if (!target || innerWidth <= 760) {
        nav.style.setProperty('--pill-o', '0');
        return;
      }
      nav.style.setProperty('--pill-x', `${target.offsetLeft}px`);
      nav.style.setProperty('--pill-w', `${target.offsetWidth}px`);
      nav.style.setProperty('--pill-o', '1');
    };
    const current = () => links.find(link => link.classList.contains('is-current'));
    const sync = () => place(hovered || current());
    links.forEach(link => {
      link.addEventListener('pointerenter', () => {hovered = link; sync();});
      link.addEventListener('focus', () => {hovered = link; sync();});
      link.addEventListener('blur', () => {hovered = null; sync();});
    });
    nav.addEventListener('pointerleave', () => {hovered = null; sync();});
    // The current section is set by the page's scroll observer.
    new MutationObserver(sync).observe(nav, {subtree: true, attributes: true, attributeFilter: ['class']});
    addEventListener('resize', sync, {passive: true});
    document.addEventListener('tenerife:language', () => requestAnimationFrame(sync));
    document.fonts?.ready.then(sync);
    sync();
  }
})();

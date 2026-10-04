(() => {
  const title = document.querySelector('#hero-title');
  if (!title) return;
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const brief = document.querySelector('.hero-brief');
  const hero = document.querySelector('#home');
  const introCopy = hero.querySelector('.hero-intro-copy');
  const benefitStrip = document.querySelector('.brief-strip');
  const languageDock = document.querySelector('.language-dock');
  const languageSource = document.querySelector('#language');
  const languageSummary = languageDock.querySelector('summary');
  const menuToggle = header.querySelector('.menu-toggle');
  const wordmark = header.querySelector('.wordmark');
  const languageSlot = header.querySelector('.language-slot');
  const titleSun = title.querySelector('.brand-sun');
  const headerSun = wordmark.querySelector('i');
  languageSummary.setAttribute('aria-describedby', 'language-current');
  const languageButtons = [...languageDock.querySelectorAll('[data-language]')];
  header.inert = true;
  const words = [...title.querySelectorAll('.brand-word')];
  const targets = [...header.querySelectorAll('.header-brand-word')];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const touchPointer = matchMedia('(pointer:coarse)');
  const smallScreen = () => document.documentElement.clientWidth <= 760;
  // Safari's browser chrome resizes innerHeight during a swipe. The opening
  // layout uses svh too, so its animation must use that same stable height.
  const viewportProbe = document.createElement('div');
  viewportProbe.setAttribute('aria-hidden', 'true');
  viewportProbe.style.cssText = 'position:absolute;width:0;height:100svh;visibility:hidden;pointer-events:none;';
  hero.append(viewportProbe);
  let viewportHeight = innerHeight, fittedWidth = 0;
  const flight = document.createElement('div');
  flight.className = 'brand-flight';
  flight.hidden = true;
  flight.setAttribute('aria-hidden', 'true');
  const flyingWords = words.map(word => {
    const clone = word.cloneNode(true);
    clone.className = 'flight-word';
    clone.removeAttribute('style');
    flight.append(clone);
    return clone;
  });
  const flyingSun = document.createElement('i');
  flyingSun.className = 'flight-sun';
  flight.append(flyingSun);
  document.body.append(flight);
  let frame = 0, needsFit = true, geometry = [];
  let titleFontSize = 1, titleLetterSpacing = 0;
  let titleColor = [248, 241, 230], headerColor = [52, 46, 41];
  let settled = false, settledAfter = Infinity;
  let collapsedState = null, flyingState = null, titleAwayState = null;
  const writtenStyles = new WeakMap();
  function setStyle(element, property, value) {
    let values = writtenStyles.get(element);
    if (!values) { values = new Map(); writtenStyles.set(element, values); }
    if (values.get(property) === value) return;
    values.set(property, value);
    element.style.setProperty(property, value);
  }
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (from, to, progress) => from + (to - from) * progress;
  const ease = value => value * value * (3 - 2 * value);

  function fit() {
    fittedWidth = document.documentElement.clientWidth;
    viewportHeight = smallScreen() || touchPointer.matches
      ? viewportProbe.offsetHeight || innerHeight : innerHeight;
    const naturalBrand = true;
    const font = getComputedStyle(title);
    titleFontSize = parseFloat(font.fontSize) || 1;
    titleLetterSpacing = parseFloat(font.letterSpacing) || 0;
    titleColor = font.color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || titleColor;
    headerColor = getComputedStyle(targets[0]).color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || headerColor;
    flight.style.fontFamily = font.fontFamily;
    flight.style.fontSize = font.fontSize;
    flight.style.fontWeight = font.fontWeight;
    flight.style.fontVariationSettings = font.fontVariationSettings;
    flight.style.letterSpacing = font.letterSpacing;
    flight.style.lineHeight = String((parseFloat(font.lineHeight) || titleFontSize) / titleFontSize);
    const measurements = [...title.querySelectorAll('.brand-line')].map((line, index) => {
      const word = line.querySelector('.brand-word');
      const reveal = line.querySelector('.brand-reveal');
      const reserve = line.querySelector('.brand-sun') ? Math.max(18, innerWidth * .023) : 0;
      const width = Math.max(1, line.clientWidth - reserve);
      const wordWidth = Math.max(1, word.offsetWidth);
      return {line, word, reveal, width, wordWidth, scale: width / wordWidth,
        paddingTop: parseFloat(getComputedStyle(line).paddingTop),
        end: targets[index].getBoundingClientRect(),
        endFontSize: parseFloat(getComputedStyle(targets[index]).fontSize)};
    });
    // Apply fitting together, then measure the fitted lines in one read phase.
    const commonScale = naturalBrand
      ? Math.min(1, ...measurements.map(item => item.scale)) : 1;
    measurements.forEach(item => {
      const {word, reveal, width, wordWidth} = item;
      if (naturalBrand) item.scale = commonScale;
      setStyle(word, '--brand-width', item.scale.toFixed(4));
      setStyle(reveal, 'width', `${naturalBrand ? wordWidth * commonScale : width}px`);
      setStyle(reveal, 'height', naturalBrand
        ? `${parseFloat(font.lineHeight) * commonScale}px` : '');
    });
    geometry = measurements.map(({line, word, reveal, scale, wordWidth, paddingTop, end, endFontSize}) => {
      const lineRect = line.getBoundingClientRect();
      const wordRect = word.getBoundingClientRect();
      const revealRect = reveal.getBoundingClientRect();
      return {
        x: naturalBrand ? wordRect.left : lineRect.left,
        y: lineRect.top + scrollY + paddingTop + wordRect.top - revealRect.top,
        scale,
        startScaleY: naturalBrand ? scale : 1,
        endX: end.left,
        endY: end.top,
        endScaleX: end.width / wordWidth,
        endScaleY: endFontSize / titleFontSize
      };
    });
    title.dataset.fitted = 'true';
    needsFit = false;
    settled = false;
  }

  function render(time) {
    frame = 0;
    if (document.hidden) return;
    // After the title and white field have arrived, later sections cannot
    // change these values. A return scroll or a refit wakes the animation.
    if (!needsFit && settled && scrollY >= settledAfter) return;
    if (needsFit) fit();
    const motionOff = media.matches || root.classList.contains('motion-off');
    const mobile = smallScreen();
    const distance = mobile
      ? Math.max(220, Math.min(360, viewportHeight * .42))
      : Math.max(240, Math.min(480, innerHeight * .62));
    const progress = clamp(scrollY / distance);
    const travel = ease(progress);
    const flying = progress > 0 && progress < 1 && !motionOff;
    const collapsed = travel > .985;
    if (!collapsed && header.contains(document.activeElement)) languageSummary.focus({preventScroll:true});
    if (!collapsed && menuToggle.getAttribute('aria-expanded') === 'true') menuToggle.click();
    if (collapsedState !== collapsed) {
      header.inert = !collapsed;
      header.classList.toggle('header-light', collapsed);
      collapsedState = collapsed;
    }
    const titleAway = motionOff ? collapsed : progress > 0;
    if (titleAwayState !== titleAway) {
      document.body.classList.toggle('brand-title-away', titleAway);
      titleAwayState = titleAway;
    }
    if (flyingState !== flying) {
      flight.hidden = !flying;
      wordmark.classList.toggle('brand-in-flight', flying);
      flyingState = flying;
    }
    // The title follows scroll only; no permanent animation loop at rest.
    if (introCopy) {
      const opacity = motionOff ? Number(!collapsed) : 1 - travel;
      setStyle(introCopy, 'opacity', opacity.toFixed(4));
      const hidden = opacity === 0;
      if (hidden && introCopy.contains(document.activeElement)) wordmark.focus({preventScroll:true});
      if (introCopy.inert !== hidden) introCopy.inert = hidden;
    }
    const float = 0;
    const briefBounds = brief.getBoundingClientRect();
    const briefTop = briefBounds.top + scrollY;
    const revealDuration = viewportHeight * (mobile ? .24 : .72);
    const reveal = mobile || motionOff || brief.contains(document.activeElement) ? 1 : clamp((scrollY - briefTop + viewportHeight * .95) / revealDuration);
    const heroTop = hero.getBoundingClientRect().top + scrollY;
    const panelTop = briefTop - heroTop;
    const panelBottom = Math.max(0, hero.offsetHeight - panelTop - briefBounds.height);
    const viewportWidth = document.documentElement.clientWidth;
    const slot = languageSlot.getBoundingClientRect();
    const dockX = collapsed ? slot.left : viewportWidth - languageDock.offsetWidth - (innerWidth <= 760 ? 20 : 26);
    const dockY = collapsed ? slot.top : (innerWidth <= 760 ? 15 : 18);
    const sun = flying ? titleSun.getBoundingClientRect() : null;
    const destination = flying ? headerSun.getBoundingClientRect() : null;
    // Finish layout reads before the scroll-driven style writes.
    setStyle(title, '--brand-float', `${(float * (1 - progress)).toFixed(2)}px`);
    const stage = (start, duration) => ease(clamp((reveal - start) / duration)).toFixed(4);
    setStyle(brief, '--brief-cut', `${((1 - ease(reveal)) * 16).toFixed(3)}%`);
    setStyle(brief, '--brief-h1', stage(.04, .28));
    setStyle(brief, '--brief-h2', stage(.14, .28));
    setStyle(brief, '--brief-h3', stage(.24, .28));
    setStyle(brief, '--brief-copy', stage(.23, .30));
    setStyle(brief, '--brief-links', stage(.36, .34));
    // The panel becomes a full white field once the title has joined the header.
    // Clip a separate surface so content keeps its layout throughout the transition.
    const whiteDuration = viewportHeight * (mobile ? .38 : .18);
    const whiteStart = mobile ? distance * .55 : distance;
    const whiteProgress = motionOff ? Number(collapsed) : clamp((scrollY - whiteStart) / whiteDuration);
    const whitePhase = ease(whiteProgress);
    // Scope inherited animation variables to their surfaces, not the whole page.
    setStyle(hero, '--white-phase', whitePhase.toFixed(4));
    setStyle(hero, '--white-blend', `${(whitePhase * 100).toFixed(3)}%`);
    if (benefitStrip) {
      setStyle(benefitStrip, '--white-phase', whitePhase.toFixed(4));
      setStyle(benefitStrip, '--white-card-blend', whiteProgress > 0 ? '100%' : '0%');
    }
    setStyle(hero, '--field-top', `${mix(panelTop, 0, whitePhase).toFixed(2)}px`);
    setStyle(hero, '--field-left', `${mix(briefBounds.left, 0, whitePhase).toFixed(2)}px`);
    setStyle(hero, '--field-right', `${mix(viewportWidth - briefBounds.right, 0, whitePhase).toFixed(2)}px`);
    setStyle(hero, '--field-bottom', `${mix(panelBottom, 0, whitePhase).toFixed(2)}px`);
    setStyle(languageDock, 'transform', `translate3d(${dockX}px,${dockY}px,0)`);
    if (!languageDock.classList.contains('is-ready')) languageDock.classList.add('is-ready');
    if (flying) {
      const ink = mobile ? Math.max(whitePhase, ease(clamp((travel - .96) / .04))) : ease(clamp((travel - .96) / .04));
      const color = titleColor.map((channel, index) => Math.round(mix(channel, headerColor[index], ink)));
      setStyle(flight, 'color', `rgb(${color.join(',')})`);
      geometry.forEach((item, index) => {
        const drift = float * (index ? -.7 : 1) * (1 - travel);
        const sizeRatio = mix(item.startScaleY, item.endScaleY, travel);
        const word = flyingWords[index];
        // Scale one glyph layer on every device; changing font size on each
        // scroll frame forces text layout and rasterization on desktop too.
        const rasterRatio = 1;
        setStyle(word, 'font-size', `${(titleFontSize * rasterRatio).toFixed(3)}px`);
        setStyle(word, 'letter-spacing', `${(titleLetterSpacing * rasterRatio).toFixed(3)}px`);
        setStyle(word, 'transform', `translate3d(${mix(item.x, item.endX, travel)}px,${mix(item.y, item.endY, travel) + drift}px,0) scale(${mix(item.scale, item.endScaleX, travel) / rasterRatio},${sizeRatio / rasterRatio})`);
      });
      const size = mix(sun.width, destination.width, travel);
      setStyle(flyingSun, 'width', `${size}px`);
      setStyle(flyingSun, 'height', `${size}px`);
      setStyle(flyingSun, 'transform', `translate3d(${mix(sun.left, destination.left, travel)}px,${mix(sun.top + scrollY, destination.top, travel)}px,0)`);
    }
    settled = progress === 1 && reveal === 1 && whiteProgress === 1;
    settledAfter = Math.max(whiteStart + whiteDuration, mobile ? 0 : briefTop - viewportHeight * .95 + revealDuration);
  }

  function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(render); }
  function refit() { needsFit = true; schedule(); }
  function syncLanguage() {
    const selected = languageButtons.find(button => button.dataset.language === languageSource.value);
    document.querySelector('#language-current').textContent = selected?.querySelector('span').textContent || 'RU';
    languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
  }
  languageButtons.forEach(button => button.addEventListener('click', () => {
    languageSource.value = button.dataset.language;
    languageSource.dispatchEvent(new Event('change', {bubbles:true}));
    languageDock.open = false;
    languageSummary.focus({preventScroll:true});
  }));
  document.addEventListener('pointerdown', event => {
    if (!languageDock.contains(event.target)) languageDock.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && languageDock.open) {
      languageDock.open = false;
      languageSummary.focus({preventScroll:true});
    }
  });
  document.addEventListener('tenerife:language', syncLanguage);
  brief.querySelectorAll('.brief-direction').forEach(direction => {
    direction.addEventListener('pointermove', event => {
      if (media.matches || root.classList.contains('motion-off') || !finePointer.matches) return;
      const bounds = direction.getBoundingClientRect();
      direction.style.setProperty('--direction-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 8}px`);
      direction.style.setProperty('--direction-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 8}px`);
    }, {passive:true});
    direction.addEventListener('pointerleave', () => {
      direction.style.setProperty('--direction-x', '0px');
      direction.style.setProperty('--direction-y', '0px');
    });
  });
  brief.addEventListener('focusin', schedule);
  brief.addEventListener('focusout', schedule);
  syncLanguage();
  fit();
  schedule();
  document.fonts?.ready.then(refit);
  new ResizeObserver(refit).observe(title);
  new ResizeObserver(refit).observe(header);
  new ResizeObserver(refit).observe(brief);
  let motionClass = root.classList.contains('motion-off');
  let introClass = root.classList.contains('intro');
  new MutationObserver(() => {
    const nextMotion = root.classList.contains('motion-off');
    const nextIntro = root.classList.contains('intro');
    if (nextMotion !== motionClass) { motionClass = nextMotion; refit(); }
    else if (nextIntro !== introClass) schedule();
    introClass = nextIntro;
  }).observe(root, {attributes:true, attributeFilter:['class']});
  media.addEventListener('change', schedule);
  window.addEventListener('scroll', () => {
    if (scrollY > 0 && root.classList.contains('intro')) window.finishTenerifeIntro?.();
    schedule();
  }, {passive:true});
  window.addEventListener('resize', () => {
    if ((smallScreen() || touchPointer.matches) && fittedWidth === document.documentElement.clientWidth) return;
    refit();
  }, {passive:true});
  document.addEventListener('tenerife:language', refit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else refit();
  });
})();

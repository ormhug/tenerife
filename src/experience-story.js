(() => {
  'use strict';
  const root = document.documentElement;
  const benefits = [...document.querySelectorAll('.glass-benefit')];
  const sequence = document.querySelector('.island-sequence');
  if (!sequence) return;
  const chapters = [...sequence.querySelectorAll('.island-chapter')];
  const sceneLabels = {
    ru: {
      route:'Впечатления маршрута', next:'Листайте вниз', last:'Дальше: подборки',
      teide:['Вулкан','Смотровые','Фотостопы'], coast:['Пляжи','Скалы','Атлантика'],
      masca:['Горные дороги','Маска','Панорамы'], ocean:['Яхта','JetSki','Атлантика']
    },
    uk: {
      route:'Враження маршруту', next:'Гортайте вниз', last:'Далі: добірки',
      teide:['Вулкан','Оглядові','Фотозупинки'], coast:['Пляжі','Скелі','Атлантика'],
      masca:['Гірські дороги','Маска','Панорами'], ocean:['Яхта','JetSki','Атлантика']
    },
    en: {
      route:'Route highlights', next:'Scroll down', last:'Next: collections',
      teide:['Volcano','Viewpoints','Photo stops'], coast:['Beaches','Cliffs','Atlantic'],
      masca:['Mountain roads','Masca','Panoramas'], ocean:['Yacht','JetSki','Atlantic']
    },
    es: {
      route:'Lo que verás', next:'Desliza hacia abajo', last:'Sigue: colecciones',
      teide:['Volcán','Miradores','Paradas para fotos'], coast:['Playas','Acantilados','Atlántico'],
      masca:['Carreteras de montaña','Masca','Panorámicas'], ocean:['Yate','JetSki','Atlántico']
    }
  };
  chapters.forEach(chapter => {
    const body = chapter.querySelector('.chapter-body');
    if (!body || body.querySelector('.chapter-route-details')) return;
    const details = document.createElement('ul');
    details.className = 'chapter-route-details';
    for (let index=0; index<3; index++) details.append(document.createElement('li'));
    const cue = document.createElement('div');
    cue.className = 'chapter-scroll-cue';
    cue.innerHTML = '<span></span><svg viewBox="0 0 16 28" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M8 2v22M3 19l5 5 5-5"/></svg>';
    body.append(details,cue);
  });
  function translateDetails() {
    const labels = sceneLabels[root.lang] || sceneLabels.ru;
    chapters.forEach((chapter,index) => {
      const key = chapter.id.replace('island-','');
      const details = chapter.querySelector('.chapter-route-details');
      const cue = chapter.querySelector('.chapter-scroll-cue span');
      if (details && labels[key]) {
        details.setAttribute('aria-label',labels.route);
        [...details.children].forEach((item,itemIndex) => {item.textContent=labels[key][itemIndex];});
      }
      if (cue) cue.textContent=index===chapters.length-1?labels.last:labels.next;
    });
  }
  translateDetails();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  let frame = 0;
  let layoutDirty = true;
  let sequenceTop = 0, headerHeight = 0;
  let benefitTops = [];
  let lastEntry = '', lastBenefits = [];
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => {const t=clamp(value);return t*t*(3-2*t);};
  // Mobile CSS already shows these blocks immediately; do not keep computing
  // and writing reveal phases that have no visible effect on a phone.
  const phone = matchMedia('(max-width: 760px)');
  const motionOff = () => phone.matches || reduced.matches || root.classList.contains('motion-off');
  let wasMotionOff = motionOff();
  function documentTop(element) {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  }
  function render() {
    frame = 0;
    if (document.hidden) return;
    const still = motionOff();
    const height = innerHeight;
    const y = scrollY;
    if (layoutDirty) {
      // Read the layout together, before applying any reveal styles. The document
      // positions stay fixed while scrolling; offsetTop excludes reveal transforms.
      headerHeight = header?.offsetHeight ?? 0;
      sequenceTop = documentTop(sequence);
      benefitTops = benefits.map(documentTop);
      layoutDirty = false;
    }
    const entry = (still ? 1 : ease((height*.90-sequenceTop+y)/(height*.90-headerHeight))).toFixed(4);
    const phases = benefitTops.map((top,index) => (still ? 1
      : ease((height*.92-top+y-index*height*.07)/(height*.36))).toFixed(4));
    if (entry !== lastEntry) {
      sequence.style.setProperty('--island-entry',entry);
      lastEntry = entry;
    }
    phases.forEach((phase,index) => {
      if (phase === lastBenefits[index]) return;
      benefits[index].style.setProperty('--benefit-progress',phase);
      lastBenefits[index] = phase;
    });
    if (!root.classList.contains('story-ready')) root.classList.add('story-ready');
  }
  function schedule() {if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
  function invalidateLayout() {layoutDirty=true;schedule();}
  function needsPhase(raw, previous) {
    return raw > 0 && raw < 1 || previous !== (raw <= 0 ? '0.0000' : '1.0000');
  }
  function scrollChanged() {
    if (layoutDirty) {schedule();return;}
    const height=innerHeight,y=scrollY;
    if (motionOff()) {
      if(lastEntry!=='1.0000'||lastBenefits.some(value=>value!=='1.0000'))schedule();
      return;
    }
    if(needsPhase((height*.90-sequenceTop+y)/(height*.90-headerHeight),lastEntry)
      ||benefitTops.some((top,index)=>needsPhase((height*.92-top+y-index*height*.07)/(height*.36),lastBenefits[index])))schedule();
  }
  window.addEventListener('scroll',scrollChanged,{passive:true});
  window.addEventListener('resize',invalidateLayout,{passive:true});
  document.addEventListener('tenerife:language',() => {translateDetails();invalidateLayout();});
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',schedule);
  phone.addEventListener('change',invalidateLayout);
  new MutationObserver(() => {
    const next=motionOff();
    if(next!==wasMotionOff){wasMotionOff=next;schedule();}
  }).observe(root,{attributes:true,attributeFilter:['class']});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidateLayout);
    observer.observe(document.body);
    if (header) observer.observe(header);
    benefits.forEach(card => observer.observe(card));
  }
  document.fonts?.ready.then(invalidateLayout);
  schedule();
})();

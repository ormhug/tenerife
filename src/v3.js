(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const locales = window.TT_LOCALES;
  if (!locales) return;
  document.documentElement.classList.add('js');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const touchPointer = matchMedia('(pointer: coarse)');
  let introTimer=0, introStarted=false;
  const lastIntroButton=$('.hero-actions .button:last-child');
  function finishIntro(){
    if(!document.documentElement.classList.contains('intro')&&!introTimer)return;
    clearTimeout(introTimer);
    introTimer=0;
    window.finishTenerifeIntro?.();
    lastIntroButton?.removeEventListener('animationend',finishOnLastButton);
  }
  function finishOnLastButton(event){
    if(event.target===lastIntroButton&&event.animationName==='intro-soft')finishIntro();
  }
  function startIntro(){
    if(introStarted)return;
    introStarted=true;
    if(media.matches||document.hidden||scrollY>80){finishIntro();return;}
    const fonts=document.fonts
      ?Promise.all([document.fonts.ready,document.fonts.load('750 100px "Bricolage Grotesque"','Tenerife Travel')])
        .then(([,faces])=>faces.length>0&&faces.every(face=>face.status==='loaded'))
      :Promise.resolve(false);
    let fontDeadline;
    Promise.race([fonts,new Promise(resolve=>{fontDeadline=setTimeout(()=>resolve(false),700);})])
      .catch(()=>false)
      .then(fontsReady=>{
        clearTimeout(fontDeadline);
        if(!fontsReady){finishIntro();return;}
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          if(media.matches||motionOff||document.hidden||scrollY>80){finishIntro();return;}
          if(!document.documentElement.classList.contains('intro'))return;
          lastIntroButton?.addEventListener('animationend',finishOnLastButton);
          document.documentElement.classList.add('intro-play');
          introTimer=setTimeout(finishIntro,3000);
        }));
      });
  }
  const clamp = (x, min=0, max=1) => Math.max(min, Math.min(max,x));
  const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
  const story=$('.island-scroll'), chapters=$$('.island-chapter'), hero=$('.hero');
  const sequence=$('.island-sequence'), stage=$('.island-chapters');
  const sceneModel=window.TT_SCENE_WIDGET;
  const sceneUnits=sceneModel.total;
  let pinnedScenes=false, sceneLayoutKey='', scenePosition=null, sceneScrollUnits=0, sceneLayout=null, sceneGalleryActive=false;
  let layoutDirty=true, geometryDirty=true, sceneGeo=null, sceneTop=0, sceneViewHeight=innerHeight, lastSceneUnits=null;
  // A small viewport unit stays fixed while Safari/Chrome hide their bars.
  // Measure only on layout invalidation, never during a scroll animation frame.
  const viewportMeasure=document.createElement('div');
  viewportMeasure.setAttribute('aria-hidden','true');
  viewportMeasure.style.cssText='position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none;contain:strict';
  document.body.append(viewportMeasure);
  const nativeSceneScroll=()=>touchPointer.matches||innerWidth<=760;
  const sceneViewportHeight=()=>nativeSceneScroll()?(viewportMeasure.offsetHeight||innerHeight):innerHeight;
  const gallery=document.createElement('div');
  gallery.className='scene-gallery';gallery.inert=true;gallery.setAttribute('aria-hidden','true');
  gallery.setAttribute('role','group');gallery.setAttribute('aria-labelledby','scene-gallery-title');
  const galleryTitle=document.createElement('h2');
  galleryTitle.id='scene-gallery-title';galleryTitle.className='scene-gallery-title';galleryTitle.dataset.i18n='scene.gallery.title';
  Object.entries({ru:'Все направления',uk:'Усі напрямки',en:'Every destination',es:'Todos los destinos'})
    .forEach(([code,label])=>{locales[code]['scene.gallery.title']=label;});
  gallery.append(galleryTitle);
  const galleryLinks=chapters.map(chapter=>{
    const source=chapter.querySelector('.chapter-book');
    const link=document.createElement('a');link.className='scene-gallery-link';link.href=source.getAttribute('href');
    if(source.dataset.service)link.dataset.service=source.dataset.service;
    if(source.dataset.shortcut)link.dataset.shortcut=source.dataset.shortcut;
    const photo=chapter.querySelector('.chapter-photo').cloneNode(true);
    photo.className='scene-gallery-photo';photo.sizes='(max-width: 760px) 50vw, 25vw';
    link.append(photo);
    const title=chapter.querySelector('.offer-title-text').cloneNode(true);
    title.className='scene-gallery-label';link.append(title,source.querySelector('svg').cloneNode(true));
    gallery.append(link);return link;
  });
  stage.append(gallery);
  const language=$('#language'), motionButton=$('#motion-toggle');
  let lang='ru', motionOff=media.matches, activeScene=-1;
  let frame=0, lastTime=0, inScene=false, heroVisible=true, activeFilter='all';
  const progress=$('.page-progress'), heroLandscape=$('.hero-landscape');
  let pageRange=1, lastProgress='', lastHeroDrift='';
  const t=key => locales[lang][key] ?? locales.ru[key] ?? key;
  function translatedElement(element){
    const key=element.dataset.i18n;
    if(key) element.textContent=t(key);
    if(element.dataset.i18nAria) element.setAttribute('aria-label',t(element.dataset.i18nAria));
    if(element.dataset.i18nPlaceholder) element.setAttribute('placeholder',t(element.dataset.i18nPlaceholder));
  }
  function applyLanguage(next,animate=false){
    lang=locales[next]?next:'ru'; document.documentElement.lang=lang; language.value=lang;
    $$('[data-i18n],[data-i18n-aria],[data-i18n-placeholder]').forEach(translatedElement);
    document.title=`Tenerife Travel | ${t('filter.tours')}, ${t('filter.ocean')}`;
    $('meta[name="description"]').content=t('hero.summary');
    updateToggle(); updateFilterStatus(); updateInquiry(); updateMenuLabel();
    document.dispatchEvent(new CustomEvent('tenerife:language'));
    try{localStorage.setItem('tenerife-language',lang);}catch{}
    if(animate&&!motionOff){document.body.classList.remove('locale-changing'); void document.body.offsetWidth; document.body.classList.add('locale-changing');}
  }
  function updateToggle(){
    document.documentElement.classList.toggle('motion-off',motionOff);
    motionButton.setAttribute('aria-pressed',String(motionOff)); $('#motion-status').textContent=t(motionOff?'ui.off':'ui.on');
    if(motionOff){document.body.classList.remove('pointer-active');finishIntro();}
    syncSceneLayout();
  }
  function syncSceneLayout(){
    // Short windows need normal page flow so the title and action stay reachable.
    const viewportHeight=sceneViewportHeight(),native=nativeSceneScroll();
    sceneViewHeight=viewportHeight;
    const next=!motionOff&&viewportHeight>=620&&(innerWidth>=960||viewportHeight>=(native?650:720));
    const top=$('.site-header').offsetHeight;
    const key=`${innerWidth}:${viewportHeight}:${top}:${next}:${native}`;
    if(key===sceneLayoutKey)return;
    const oldTop=parseFloat(getComputedStyle(stage).top)||0;
    const bounds=stage.getBoundingClientRect();
    const chapterBounds=activeScene>=0?chapters[activeScene].getBoundingClientRect():null;
    const staticInView=!pinnedScenes&&chapterBounds&&chapterBounds.bottom>top&&chapterBounds.top<viewportHeight;
    // Repositioning during a finger gesture fights the browser's own momentum.
    // Touch/orientation changes keep the native page position instead.
    const preserve=!native&&sceneLayoutKey&&((pinnedScenes&&Math.abs(bounds.top-oldTop)<3)||staticInView)?Math.max(0,activeScene):null;
    const changed=next!==pinnedScenes;
    const preservedUnits=pinnedScenes&&next?sceneScrollUnits:sceneModel.stops[preserve??0];
    pinnedScenes=next;
    sceneLayoutKey=key;
    sceneTop=top;
    geometryDirty=true;
    lastSceneUnits=null;
    document.documentElement.classList.toggle('island-pinned',next);
    document.documentElement.classList.toggle('island-mobile-motion',native);
    sequence.style.setProperty('--scene-top',`${top}px`);
    sequence.style.setProperty('--scene-height',`${Math.min(940,viewportHeight-top)}px`);
    sequence.style.setProperty('--scene-step',`${Math.max(native?300:340,Math.min(640,viewportHeight*(native ? .58 : .6)))}px`);
    sequence.style.setProperty('--scene-units',String(sceneUnits));
    sceneLayout=sceneModel.geometry(stage.clientWidth,Math.min(940,viewportHeight-top));
    stage.classList.toggle('scene-narrow',sceneLayout.narrow);
    galleryLinks.forEach((link,i)=>{
      const box=sceneLayout.gallery[i];
      ['x','y','w','h'].forEach(key=>link.style.setProperty(`--gallery-${key}`,`${box[key].toFixed(2)}px`));
    });
    scenePosition=null;
    if(changed)setScene(Math.max(0,activeScene),true);
    if(preserve!==null){
      const geo=sceneGeometry();
      // Keep fractional progress when a viewport/header resize changes geometry.
      // Mode changes still land on the readable hold of the selected chapter.
      const goal=next?geo.start+geo.distance*preservedUnits/sceneUnits:scrollY+chapters[preserve].getBoundingClientRect().top-top;
      if(window.TT_SCROLL)window.TT_SCROLL.to(goal,{immediate:true});
      else window.scrollTo({top:goal,behavior:'instant'});
    }
  }
  function setScene(index,force=false,galleryMode=false){
    if(index===activeScene&&sceneGalleryActive===galleryMode&&!force)return;
    activeScene=index;
    sceneGalleryActive=galleryMode;
    const showGallery=pinnedScenes&&galleryMode;
    if(!showGallery&&gallery.contains(document.activeElement))stage.focus({preventScroll:true});
    gallery.inert=!showGallery;
    if(showGallery)gallery.removeAttribute('aria-hidden');else gallery.setAttribute('aria-hidden','true');
    $$('[data-chapter-link]').forEach((link,i)=>{
      link.classList.toggle('is-current',i===index);
      if(i===index)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    chapters.forEach((chapter,i)=>{
      const hidden=pinnedScenes&&(galleryMode||i!==index);
      if(hidden&&chapter.contains(document.activeElement))stage.focus({preventScroll:true});
      chapter.inert=hidden;
      if(hidden)chapter.setAttribute('aria-hidden','true');
      else chapter.removeAttribute('aria-hidden');
    });
  }
  function sceneGeometry(){
    if(geometryDirty||!sceneGeo){
      const height=sequence.offsetHeight;
      sceneGeo={top:sceneTop,height,distance:Math.max(1,height-stage.offsetHeight),
        start:scrollY+sequence.getBoundingClientRect().top-sceneTop};
      pageRange=Math.max(1,document.documentElement.scrollHeight-sceneViewHeight);
      geometryDirty=false;
    }
    return sceneGeo;
  }
  function goToScene(index,{immediate=false,focus=false,history=false}={}){
    if(!pinnedScenes)return;
    const geo=sceneGeometry();
    const top=geo.start+geo.distance*sceneModel.stops[index]/sceneUnits;
    if(immediate)scenePosition=null;
    if(history&&location.hash!==`#${chapters[index].id}`)window.history.pushState(null,'',`#${chapters[index].id}`);
    const onComplete=()=>{
      if(focus){const title=chapters[index].querySelector('h3');title.tabIndex=-1;title.focus({preventScroll:true});title.addEventListener('blur',()=>title.removeAttribute('tabindex'),{once:true});}
    };
    if(window.TT_SCROLL)window.TT_SCROLL.to(top,{immediate,onComplete});
    else{window.scrollTo({top,behavior:immediate?'instant':'smooth'});if(immediate)onComplete();}
  }
  function restoreSceneHash(){
    const index=chapters.findIndex(chapter=>`#${chapter.id}`===location.hash);
    if(index>=0)requestAnimationFrame(()=>requestAnimationFrame(()=>goToScene(index,{immediate:true})));
  }
  function setSceneVars(chapter,values){
    const cache=chapter._sceneVars||(chapter._sceneVars={});
    Object.entries(values).forEach(([prop,value])=>{
      if(cache[prop]!==value){cache[prop]=value;chapter.style.setProperty(prop,value);}
    });
  }
  function renderSceneWidgets(units){
    if(units===lastSceneUnits)return;
    lastSceneUnits=units;
    const state=nativeSceneScroll()?sceneModel.sampleMobile(units,sceneLayout):sceneModel.sample(units,sceneLayout);
    state.frames.forEach((view,index)=>{
      const chapter=chapters[index],px=n=>`${n.toFixed(2)}px`;
      if(chapter._sceneWidget!==view.widget){
        chapter._sceneWidget=view.widget;chapter.classList.toggle('is-widget',view.widget);
      }
      setSceneVars(chapter,{
        '--widget-x':px(view.box.x),'--widget-y':px(view.box.y),'--widget-w':px(view.box.w),'--widget-h':px(view.box.h),
        '--widget-r':px(view.box.r),'--widget-alpha':view.alpha.toFixed(4),'--widget-layer':String(view.layer),
        '--widget-shade':view.shade.toFixed(4),'--copy-x':px(view.copy.x),'--copy-y':px(view.copy.y),
        '--copy-w':px(view.copy.w),'--copy-h':px(view.copy.h),'--copy-alpha':view.copyAlpha.toFixed(4),
        '--copy-shift':px(view.copyShift),'--copy-shift-x':px(view.copyShiftX)
      });
    });
    setSceneVars(gallery,{'--gallery-alpha':state.galleryAlpha.toFixed(4)});
    setScene(state.active,false,state.galleryActive);
  }
  function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
  function renderHeroLandscape(){
    if(nativeSceneScroll()||motionOff){
      // Also clear a desktop transform once if the window switches to a phone.
      if(lastHeroDrift){lastHeroDrift='';heroLandscape.style.removeProperty('transform');}
      return;
    }
    if(!heroVisible)return;
    const drift=`translate3d(0,${Math.min(scrollY*.12,95).toFixed(2)}px,0) scale(1.045)`;
    if(drift!==lastHeroDrift){lastHeroDrift=drift;heroLandscape.style.transform=drift;}
  }
  function render(time){
    frame=0;if(document.hidden)return;
    const delta=Math.min(40,lastTime?time-lastTime:16);lastTime=time;
    if(layoutDirty){layoutDirty=false;syncSceneLayout();}
    // Dimensions change on resize/content changes, never as a side effect of
    // wheel input. Read them before writing animation styles.
    const geo=sceneGeometry();
    let sceneMoving=false;
    if(pinnedScenes){
      const targetUnits=clamp((scrollY-geo.start)/geo.distance)*sceneUnits;
      sceneScrollUnits=targetUnits;
      // Native phone momentum and Lenis both own the page movement. Follow
      // either 1:1 so a swipe does not leave a second animation chasing it.
      // The light follow is only for desktop keyboard/scrollbar jumps.
      const lenisOn=!!window.TT_SCROLL?.state?.enabled;
      if(nativeSceneScroll()||lenisOn||scenePosition===null||scrollY<geo.start||scrollY>geo.start+geo.distance)scenePosition=targetUnits;
      else scenePosition+=(targetUnits-scenePosition)*(1-Math.exp(-delta/90));
      if(Math.abs(targetUnits-scenePosition)<.0005)scenePosition=targetUnits;
      sceneMoving=scenePosition!==targetUnits;
      renderSceneWidgets(scenePosition);
    }else{
      scenePosition=null;
      let closest=-1,closestDistance=Infinity;
      const inSequence=scrollY+innerHeight>geo.start+geo.top&&scrollY<geo.start+geo.top+geo.height;
      const measured=inSequence?chapters.map(chapter=>chapter.getBoundingClientRect()):[];
      const parallax=!motionOff&&!nativeSceneScroll();
      measured.forEach((bounds,index)=>{
        const chapter=chapters[index];
        if(bounds.bottom<0||bounds.top>innerHeight)return;
        const center=bounds.top+bounds.height/2,distance=Math.abs(center-innerHeight/2);
        if(distance<closestDistance){closestDistance=distance;closest=index;}
        const travel=clamp((innerHeight/2-center)/(innerHeight+bounds.height),-.5,.5);
        setSceneVars(chapter,{
          '--photo-drift':parallax?`${(travel*110).toFixed(2)}px`:'0px',
          '--title-drift':parallax?`${(travel*-50).toFixed(2)}px`:'0px',
          '--chapter-progress':String(clamp((innerHeight-bounds.top)/(innerHeight+bounds.height)))
        });
      });
      setScene(closest);
    }
    const progressValue=`scaleX(${clamp(scrollY/pageRange).toFixed(5)})`;
    if(progressValue!==lastProgress){lastProgress=progressValue;progress.style.transform=progressValue;}
    renderHeroLandscape();
    if(sceneMoving)schedule();
  }
  const sceneObserver=new IntersectionObserver(entries=>{inScene=entries[0].isIntersecting;document.body.classList.toggle('scene-in-view',inScene);schedule();},{threshold:0});sceneObserver.observe(story);
  $$('[data-chapter-link]').forEach((link,index)=>link.addEventListener('click',event=>{
    if(!pinnedScenes||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();goToScene(index,{history:true,focus:event.detail===0});
  }));
  window.addEventListener('hashchange',restoreSceneHash);
  window.addEventListener('popstate',restoreSceneHash);
  window.addEventListener('load',restoreSceneHash,{once:true});
  new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;document.body.classList.toggle('hero-in-view',heroVisible);schedule();},{threshold:.25}).observe(hero);
  new IntersectionObserver(entries=>document.body.classList.toggle('booking-in-view',entries[0].isIntersecting),{threshold:.2}).observe($('#booking'));
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{threshold:.06,rootMargin:'0px 0px -15px 0px'});
  $$('.reveal').forEach(element=>revealObserver.observe(element));
  const navObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){$$('.main-nav a').forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('is-current',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}}),{rootMargin:'-15% 0px -65% 0px',threshold:0});
  ['island','services','how'].forEach(id=>navObserver.observe($('#'+id)));
  function updateFilterStatus(){const count=$$('.experience-card').filter(card=>!card.hidden).length;$('#filter-status').textContent=t('filter.summary').replace('{count}',String(count));}
  function filterServices(category){
    activeFilter=category;
    const cards=$$('.experience-card');
    $$('.filter').forEach(button=>{const selected=button.dataset.filter===category;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));});
    cards.forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;card.classList.add('is-visible');});
    $('#experience-rail')?.scrollTo({left:0,behavior:'instant'});
    if(!motionOff)cards.filter(card=>!card.hidden).forEach(card=>{
      card.animate([{transform:'translateY(10px)',opacity:.25},{transform:'none',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
    });
    updateFilterStatus();schedule();document.dispatchEvent(new CustomEvent('tenerife:filter'));
  }
  $$('.filter').forEach(button=>button.addEventListener('click',()=>filterServices(button.dataset.filter)));
  $$('[data-shortcut]').forEach(link=>link.addEventListener('click',()=>filterServices(link.dataset.shortcut)));
  const form=$('#inquiry-form'),service=$('#service'),date=$('#date'),people=$('#people'),wishes=$('#wishes'),send=$('#send-inquiry');
  const preference=$('#trip-preference');
  const today=new Date();date.min=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  function updateInquiry(){
    let requestedDate=t('message.later');
    if(date.value){const [year,month,day]=date.value.split('-').map(Number);requestedDate=new Intl.DateTimeFormat(lang).format(new Date(year,month-1,day));}
    const serviceTitle=t('service.'+service.value+'.title');
    const message=[t('message.hello'),`${t('booking.service')} ${serviceTitle}`,`${t('booking.date')}: ${requestedDate}`,`${t('booking.guests')}: ${people.value}`];
    if(preference.dataset.service!==service.value)preference.value='';
    $('#selected-preference').hidden=!preference.value;
    $('#selected-preference-text').textContent=preference.value?t('pref.'+preference.value):'';
    if(preference.value)message.push(`${t('dialog.preferences')}: ${t('pref.'+preference.value)}`);
    if(wishes.value.trim())message.push(`${t('booking.wishes')}: ${wishes.value.trim()}`);
    message.push(t('message.end'));send.href='https://wa.me/34607020014?text='+encodeURIComponent(message.join('\n'));
    $('#inquiry-preview').textContent=`${serviceTitle} · ${requestedDate} · ${people.value}`;
  }
  form.addEventListener('input',updateInquiry);form.addEventListener('change',updateInquiry);form.addEventListener('submit',event=>event.preventDefault());
  $('#clear-preference').addEventListener('click',()=>{preference.value='';updateInquiry();service.focus();});
  send.addEventListener('click',event=>{if(!form.reportValidity())event.preventDefault();});
  $$('[data-service]').forEach(link=>link.addEventListener('click',()=>{service.value=link.dataset.service;updateInquiry();if(!motionOff)form.animate([{boxShadow:'0 0 0 2px #74cfe488'},{boxShadow:'0 0 0 0 #74cfe400'}],{duration:1100});}));
  const menu=$('.menu-toggle'),nav=$('.main-nav');
  function updateMenuLabel(){menu.dataset.i18nAria=menu.getAttribute('aria-expanded')==='true'?'ui.closeMenu':'ui.menu';translatedElement(menu);}
  function setMenu(open){menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);updateMenuLabel();}
  function closeMenu(){setMenu(false);}
  menu.addEventListener('click',()=>{finishIntro();setMenu(menu.getAttribute('aria-expanded')!=='true');});
  $$('.main-nav a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('is-open')){closeMenu();menu.focus();}});
  document.addEventListener('pointerdown',event=>{if(!nav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
  function impact(event,element){
    if(motionOff)return;const rect=element.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='impact';ripple.setAttribute('aria-hidden','true');
    ripple.style.left=(event.clientX-rect.left)+'px';ripple.style.top=(event.clientY-rect.top)+'px';element.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
    if(element.classList.contains('reactive-panel')){element.classList.remove('impact-active');void element.offsetWidth;element.classList.add('impact-active');}
  }
  $$('.reactive-panel,.button,.filter').forEach(element=>{
    element.addEventListener('pointerdown',event=>{if(event.target.closest('.button,.filter,.reactive-panel')===element)impact(event,element);});
    element.addEventListener('pointermove',event=>{
      if(!finePointer.matches||motionOff)return;const rect=element.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      element.style.setProperty('--pointer-x',x*100+'%');element.style.setProperty('--pointer-y',y*100+'%');
      if(element.classList.contains('experience-card')){element.style.setProperty('--tilt-axis',`${-(y-.5)} ${x-.5} 0`);element.style.setProperty('--tilt-angle','2deg');}
      if(element.classList.contains('button')){element.style.setProperty('--magnet-x',(x-.5)*6+'px');element.style.setProperty('--magnet-y',(y-.5)*6+'px');}
    });
    element.addEventListener('pointerleave',()=>{element.style.setProperty('--tilt-angle','0deg');element.style.setProperty('--magnet-x','0px');element.style.setProperty('--magnet-y','0px');});
  });
  // The former global cursor glow is retired by the design; it must not keep
  // scene rendering alive on every pointer movement.
  motionButton.addEventListener('click',()=>{motionOff=!motionOff;updateToggle();schedule();});
  media.addEventListener('change',event=>{motionOff=event.matches;updateToggle();schedule();});
  language.addEventListener('change',()=>{finishIntro();applyLanguage(language.value,true);});
  document.addEventListener('focusin',finishIntro);
  function invalidateGeometry(){geometryDirty=true;schedule();}
  function invalidateLayout(){layoutDirty=true;invalidateGeometry();}
  const layoutObserver=new ResizeObserver(invalidateGeometry);
  [document.body,hero,$('.hero-brief'),sequence].filter(Boolean).forEach(element=>layoutObserver.observe(element));
  new ResizeObserver(invalidateLayout).observe($('.site-header'));
  document.fonts?.ready.then(invalidateLayout);
  document.addEventListener('tenerife:language',invalidateLayout);
  touchPointer.addEventListener('change',invalidateLayout);
  window.addEventListener('scroll',()=>{if(scrollY>80)finishIntro();schedule();},{passive:true});window.addEventListener('resize',()=>{if(innerWidth>760)closeMenu();invalidateLayout();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finishIntro();cancelAnimationFrame(frame);frame=0;lastTime=0;document.body.classList.remove('scene-in-view');}else{document.body.classList.toggle('scene-in-view',inScene);schedule();}});
  try{const saved=localStorage.getItem('tenerife-language');if(locales[saved])lang=saved;}catch{}
  setScene(0);applyLanguage(lang);schedule();startIntro();restoreSceneHash();
})();

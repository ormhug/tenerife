/* Exercise the actual pointer handlers, including touch capture transfer. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/brief-carousel.js'), 'utf8');
const start = source.indexOf("  viewport.addEventListener('pointerdown'");
const end = source.indexOf('  new IntersectionObserver', start);
assert.ok(start > 0 && end > start);
function fixture() {
  const handlers = {}, shown = [];
  const slide = {closest: () => false};
  const viewport = {clientWidth:340, classList:{add(){},remove(){}},
    addEventListener(type, handler) {handlers[type] = handler;},
    setPointerCapture(id) {
      handlers.lostpointercapture({type:'lostpointercapture', pointerId:id, target:slide});
    }
  };
  const context = vm.createContext({viewport, gesture:null, suppressUntil:0, active:0,
    cancelInteraction(){context.gesture=null;}, resetCursor(){},syncClock(){},
    previewGesture(){},cleanSlides(){},followCursor(){},
    releaseGesture(){const previous=context.gesture;context.gesture=null;return previous;},
    performance:{now:()=>100},show:(...args)=>shown.push(args)});
  vm.runInContext(source.slice(start,end),context);
  function emit(type, x=200, y=100, extra={}) {
    const event={type,pointerId:1,pointerType:'touch',isPrimary:true,button:0,
      clientX:x,clientY:y,target:slide,preventDefault(){this.prevented=true;},
      stopImmediatePropagation(){this.stopped=true;},...extra};
    handlers[type](event);return event;
  }
  return {context,shown,viewport,emit};
}
for (const [endX, direction] of [[80,1],[300,-1]]) {
  const {emit,context,shown}=fixture();
  emit('pointerdown');emit('pointermove',endX);
  assert.ok(context.gesture?.active,'child capture loss must not cancel the swipe');
  emit('pointerup',endX);
  assert.equal(shown.length,1);assert.equal(shown[0][1],direction);
  const click=emit('click',endX,100,{detail:1});
  assert.ok(click.prevented && click.stopped,'swipe does not open the photo link');
  const button=emit('click',endX,100,{detail:1,target:{closest:()=>true}});
  assert.ok(!button.prevented,'arrow/dot clicks still work immediately after a swipe');
}
for (const ending of ['pointercancel','lostpointercapture']) {
  const {emit,shown,viewport}=fixture();
  emit('pointerdown');emit('pointermove',80);
  emit(ending,80,100,{target:viewport});emit('pointerup',80);
  assert.equal(shown.length,0,'cancelled gesture never changes the slide');
}
{
  const {emit,shown}=fixture();
  emit('pointerdown');
  assert.ok(!emit('pointermove',202,200).prevented,'vertical scroll stays native');
  emit('pointerup',202,200);assert.equal(shown.length,0);
  emit('pointerdown');emit('pointerup');
  assert.ok(!emit('click',200,100,{detail:1}).prevented,'tap still opens the photo');
}
{
  const {emit,context}=fixture();
  emit('pointerdown',200,100,{target:{closest:()=>true}});
  assert.equal(context.gesture,null,'navigation controls keep their click behavior');
}
console.log('Carousel: touch capture transfer, both swipe directions, cancellation, vertical scroll, tap and controls passed.');
